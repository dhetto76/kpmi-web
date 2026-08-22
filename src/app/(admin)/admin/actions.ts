"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdminContext, type AdminContext } from "@/lib/auth";
import { KORWIL } from "@/lib/reference-data";
import { businessSchema, productSchema } from "@/lib/validations";
import { slugify } from "@/lib/utils";

export type ActionResult = { error: string } | { success: true };

/**
 * Admin actions.
 *
 * Each re-checks the role server-side. Middleware also gates /admin, and RLS
 * gates the tables — three layers, because privilege escalation is the failure
 * that matters most here.
 *
 * A super_admin acts platform-wide. An admin_korwil acts only on members and
 * businesses whose owner belongs to their region; the checks below produce a
 * clear message, and RLS enforces the same rule regardless.
 */
async function requireAdmin() {
  const supabase = await createClient();
  const ctx = await requireAdminContext();
  return { supabase, ctx };
}

const OUT_OF_SCOPE = "Di luar wilayah korwil Anda.";

const STATUSES = ["pending", "approved", "rejected"] as const;
type Status = (typeof STATUSES)[number];

function isStatus(value: string): value is Status {
  return (STATUSES as readonly string[]).includes(value);
}

export async function setMemberStatus(
  id: string,
  status: string,
): Promise<ActionResult> {
  if (!isStatus(status)) return { error: "Status tidak valid." };
  const { supabase, ctx } = await requireAdmin();

  if (!ctx.isSuperAdmin) {
    const { data: target } = await supabase
      .from("profiles")
      .select("korwil")
      .eq("id", id)
      .maybeSingle();
    if (!target || target.korwil !== ctx.managedKorwil) {
      return { error: OUT_OF_SCOPE };
    }
  }

  const { error } = await supabase.from("profiles").update({ status }).eq("id", id);
  if (error) return { error: "Gagal memperbarui status anggota." };

  revalidatePath("/admin/anggota");
  return { success: true };
}

export async function approveMembers(
  ids: string[],
): Promise<{ error: string } | { success: true; updatedCount: number }> {
  const uniqueIds = [...new Set(ids)];
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (uniqueIds.length === 0) return { error: "Pilih setidaknya satu anggota." };
  if (uniqueIds.length > 100) return { error: "Maksimal 100 anggota sekali proses." };
  if (uniqueIds.some((id) => !uuid.test(id))) return { error: "ID anggota tidak valid." };

  const { supabase, ctx } = await requireAdmin();
  let targetQuery = supabase
    .from("profiles")
    .select("id, korwil")
    .in("id", uniqueIds)
    .eq("role", "member");

  if (!ctx.isSuperAdmin) {
    if (!ctx.managedKorwil) return { error: OUT_OF_SCOPE };
    targetQuery = targetQuery.eq("korwil", ctx.managedKorwil);
  }

  const { data: targets, error: targetError } = await targetQuery;
  if (targetError || targets?.length !== uniqueIds.length) {
    return { error: "Satu atau lebih anggota berada di luar kewenangan Anda." };
  }

  const { data: updated, error } = await supabase
    .from("profiles")
    .update({ status: "approved" })
    .in("id", uniqueIds)
    .eq("role", "member")
    .select("id");

  if (error || updated?.length !== uniqueIds.length) {
    return { error: "Gagal menyetujui anggota yang dipilih." };
  }

  revalidatePath("/admin/anggota");
  return { success: true, updatedCount: updated.length };
}

export async function deleteMembers(
  ids: string[],
): Promise<{ error: string } | { success: true; deletedCount: number }> {
  const uniqueIds = [...new Set(ids)];
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (uniqueIds.length === 0) return { error: "Pilih setidaknya satu anggota." };
  if (uniqueIds.length > 100) return { error: "Maksimal 100 anggota sekali hapus." };
  if (uniqueIds.some((id) => !uuid.test(id))) return { error: "ID anggota tidak valid." };

  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.rpc("delete_members", {
    target_ids: uniqueIds,
  });

  if (error) return { error: "Gagal menghapus anggota." };

  const deletedCount = typeof data === "number" ? data : 0;
  if (deletedCount === 0) {
    return { error: "Tidak ada anggota yang dapat dihapus." };
  }

  revalidatePath("/admin/anggota");
  revalidatePath("/admin/bisnis");
  revalidatePath("/admin/produk");
  revalidatePath("/bisnis");
  revalidatePath("/produk");
  return { success: true, deletedCount };
}

export async function setBusinessStatus(
  id: string,
  status: string,
): Promise<ActionResult> {
  if (!isStatus(status)) return { error: "Status tidak valid." };
  const { supabase, ctx } = await requireAdmin();

  const { data: target } = await supabase
    .from("businesses")
    .select("owner_id, owner:profiles(korwil)")
    .eq("id", id)
    .maybeSingle();

  if (!target) return { error: "Usaha tidak ditemukan." };

  if (!ctx.isSuperAdmin) {
    const owner = Array.isArray(target.owner) ? target.owner[0] : target.owner;
    if (owner?.korwil !== ctx.managedKorwil) return { error: OUT_OF_SCOPE };
    // A korwil admin must not approve their own business.
    if (target.owner_id === ctx.userId) {
      return { error: "Anda tidak dapat menyetujui usaha milik sendiri." };
    }
  }

  const { error } = await supabase.from("businesses").update({ status }).eq("id", id);
  if (error) return { error: "Gagal memperbarui status usaha." };

  revalidatePath("/admin/bisnis");
  revalidatePath("/bisnis");
  return { success: true };
}

export async function setProductPublished(
  id: string,
  isPublished: boolean,
): Promise<ActionResult> {
  const { supabase, ctx } = await requireAdmin();

  if (!ctx.isSuperAdmin) {
    const { data: target } = await supabase
      .from("products")
      .select("business:businesses(owner:profiles(korwil))")
      .eq("id", id)
      .maybeSingle();

    const business = Array.isArray(target?.business) ? target.business[0] : target?.business;
    const owner = Array.isArray(business?.owner) ? business.owner[0] : business?.owner;
    if (!target || owner?.korwil !== ctx.managedKorwil) return { error: OUT_OF_SCOPE };
  }

  const { error } = await supabase
    .from("products")
    .update({ is_published: isPublished })
    .eq("id", id);

  if (error) return { error: "Gagal memperbarui produk." };

  revalidatePath("/admin/produk");
  revalidatePath("/produk");
  return { success: true };
}

/* ----------------------------------------------------------- Role granting */

const ROLES = ["member", "admin_korwil", "super_admin"] as const;
type GrantableRole = (typeof ROLES)[number];

function isRole(value: string): value is GrantableRole {
  return (ROLES as readonly string[]).includes(value);
}

/**
 * Assigns a role. Super admin only — a korwil admin cannot mint other admins,
 * so a single compromised regional account cannot multiply itself.
 *
 * `managedKorwil` is required for admin_korwil and must be null otherwise; the
 * profiles_managed_korwil_check constraint enforces the same pairing.
 */
export async function setMemberRole(
  id: string,
  role: string,
  managedKorwil?: string | null,
): Promise<ActionResult> {
  if (!isRole(role)) return { error: "Peran tidak valid." };

  const { supabase, ctx } = await requireAdmin();
  if (!ctx.isSuperAdmin) {
    return { error: "Hanya Super Admin yang dapat mengubah peran." };
  }

  // Removing your own super admin rights could leave the platform with no
  // administrator at all, and you could not undo it.
  if (id === ctx.userId && role !== "super_admin") {
    return { error: "Anda tidak dapat menurunkan peran Anda sendiri." };
  }

  let region: string | null = null;
  if (role === "admin_korwil") {
    if (!managedKorwil) return { error: "Pilih wilayah korwil untuk Admin Korwil." };
    if (!(KORWIL as readonly string[]).includes(managedKorwil)) {
      return { error: "Wilayah korwil tidak valid." };
    }
    region = managedKorwil;
  }

  const { error } = await supabase
    .from("profiles")
    .update({ role, managed_korwil: region })
    .eq("id", id);

  if (error) return { error: "Gagal memperbarui peran." };

  revalidatePath("/admin/anggota");
  return { success: true };
}

/* ------------------------------------------------- Editing usaha & produk */

/**
 * Admin editing of member content.
 *
 * Approving is not always enough — an administrator often needs to correct a
 * typo, drop a stale phone number, or take down an inappropriate product.
 * These actions do exactly what the member's own edit form does, but scoped:
 * a super admin edits anything, a korwil admin only what their region owns.
 *
 * RLS grants administrators `for all` on both tables within that same scope,
 * so the checks below produce the clear message and the database guarantees
 * the boundary.
 */

/** Turns empty form strings into nulls so the database stores NULL, not "". */
function clean<T extends Record<string, unknown>>(obj: T) {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k, v === "" ? null : v]),
  );
}

/** Null when the caller may administer this business, an error otherwise. */
async function scopedBusiness(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ctx: AdminContext,
  id: string,
): Promise<{ error: string } | null> {
  const { data } = await supabase
    .from("businesses")
    .select("owner:profiles(korwil)")
    .eq("id", id)
    .maybeSingle();

  if (!data) return { error: "Usaha tidak ditemukan." };

  if (!ctx.isSuperAdmin) {
    const owner = Array.isArray(data.owner) ? data.owner[0] : data.owner;
    if (owner?.korwil !== ctx.managedKorwil) return { error: OUT_OF_SCOPE };
  }

  return null;
}

/** Same check for a product, resolved through its parent business. */
async function scopedProduct(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ctx: AdminContext,
  id: string,
): Promise<{ error: string } | null> {
  const { data } = await supabase
    .from("products")
    .select("business:businesses(owner:profiles(korwil))")
    .eq("id", id)
    .maybeSingle();

  if (!data) return { error: "Produk tidak ditemukan." };

  if (!ctx.isSuperAdmin) {
    const business = Array.isArray(data.business) ? data.business[0] : data.business;
    const owner = Array.isArray(business?.owner) ? business.owner[0] : business?.owner;
    if (owner?.korwil !== ctx.managedKorwil) return { error: OUT_OF_SCOPE };
  }

  return null;
}

/** Appends a short suffix if the slug is taken, so names may repeat. */
async function uniqueBusinessSlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  name: string,
  ignoreId: string,
) {
  const base = slugify(name);
  let slug = base;

  for (let i = 0; i < 20; i++) {
    const { data } = await supabase
      .from("businesses")
      .select("id")
      .eq("slug", slug)
      .neq("id", ignoreId)
      .maybeSingle();
    if (!data) return slug;
    slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export async function adminUpdateBusiness(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  const { supabase, ctx } = await requireAdmin();

  const denied = await scopedBusiness(supabase, ctx, id);
  if (denied) return denied;

  const parsed = businessSchema.safeParse({
    ...Object.fromEntries(formData),
    has_branches: formData.get("has_branches") === "on",
    has_marketing_team: formData.get("has_marketing_team") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // The public URL carries the slug, so a renamed business needs a fresh one.
  const { data: current } = await supabase
    .from("businesses")
    .select("name, slug")
    .eq("id", id)
    .single();

  const values: Record<string, unknown> = clean(parsed.data);
  if (current && current.name !== parsed.data.name) {
    values.slug = await uniqueBusinessSlug(supabase, parsed.data.name, id);
  }

  const { error } = await supabase.from("businesses").update(values).eq("id", id);
  if (error) return { error: "Gagal menyimpan perubahan." };

  revalidatePath("/admin/bisnis");
  revalidatePath(`/admin/bisnis/${id}`);
  revalidatePath("/bisnis");
  if (current?.slug) revalidatePath(`/bisnis/${current.slug}`);
  if (typeof values.slug === "string") revalidatePath(`/bisnis/${values.slug}`);
  return { success: true };
}

export async function adminDeleteBusiness(id: string): Promise<ActionResult> {
  const { supabase, ctx } = await requireAdmin();

  const denied = await scopedBusiness(supabase, ctx, id);
  if (denied) return denied;

  const { error } = await supabase.from("businesses").delete().eq("id", id);
  if (error) return { error: "Gagal menghapus usaha." };

  revalidatePath("/admin/bisnis");
  revalidatePath("/bisnis");
  revalidatePath("/admin/produk");
  return { success: true };
}

export async function adminUpdateProduct(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  const { supabase, ctx } = await requireAdmin();

  const denied = await scopedProduct(supabase, ctx, id);
  if (denied) return denied;

  const parsed = productSchema.safeParse({
    ...Object.fromEntries(formData),
    images: formData.getAll("images").filter(Boolean) as string[],
    is_published: formData.get("is_published") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { error } = await supabase
    .from("products")
    .update({ ...clean(parsed.data), slug: slugify(parsed.data.name) })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return { error: "Produk dengan nama itu sudah ada pada usaha ini." };
    }
    return { error: "Gagal menyimpan perubahan." };
  }

  revalidatePath("/admin/produk");
  revalidatePath(`/admin/produk/${id}`);
  revalidatePath("/produk");
  return { success: true };
}

export async function adminDeleteProduct(id: string): Promise<ActionResult> {
  const { supabase, ctx } = await requireAdmin();

  const denied = await scopedProduct(supabase, ctx, id);
  if (denied) return denied;

  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) return { error: "Gagal menghapus produk." };

  revalidatePath("/admin/produk");
  revalidatePath("/produk");
  return { success: true };
}
