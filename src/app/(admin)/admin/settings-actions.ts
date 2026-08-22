"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdminContext } from "@/lib/auth";
import { slugify } from "@/lib/utils";
import {
  REFERENCE_KINDS,
  SETTING_KEYS,
  type ReferenceKind,
  type SettingKey,
} from "@/lib/settings";
import { KORWIL } from "@/lib/reference-data";

/**
 * Settings actions: reference lists and site settings.
 *
 * Every write here is super-admin only. A korwil admin editing the korwil list
 * could invent a region and hand it to themselves, and settings are global by
 * definition — neither is regional work. RLS enforces the same rule, so a
 * bypass of this check still fails at the database.
 */

export type ActionResult = { error: string } | { success: true };

const SUPER_ADMIN_ONLY = "Hanya Super Admin yang dapat mengubah pengaturan.";

type SuperAdminGate =
  | { ok: false; error: string }
  | {
      ok: true;
      supabase: Awaited<ReturnType<typeof createClient>>;
      ctx: Awaited<ReturnType<typeof requireAdminContext>>;
    };

async function requireSuperAdmin(): Promise<SuperAdminGate> {
  const supabase = await createClient();
  const ctx = await requireAdminContext();
  if (!ctx.isSuperAdmin) return { ok: false, error: SUPER_ADMIN_ONLY };
  return { ok: true, supabase, ctx };
}

function isKind(value: string): value is ReferenceKind {
  return (REFERENCE_KINDS as readonly string[]).includes(value);
}

/** Admin route segment for each list, so an action can revalidate its page. */
const KIND_ROUTE: Record<ReferenceKind, string> = {
  korwil: "korwil",
  product_category: "kategori",
  industry: "industri",
};

/** Pages whose content depends on the reference lists. */
function revalidateReference(kind: ReferenceKind) {
  revalidatePath(`/admin/${KIND_ROUTE[kind]}`);
  revalidatePath("/daftar");
  revalidatePath("/dashboard/profil");
  if (kind === "korwil") revalidatePath("/");
  if (kind === "industry") revalidatePath("/bisnis");
  if (kind === "product_category") revalidatePath("/produk");
}

/* ------------------------------------------------------- Reference values */

export async function createReferenceValue(
  kind: string,
  name: string,
): Promise<ActionResult> {
  if (!isKind(kind)) return { error: "Jenis daftar tidak valid." };

  const trimmed = name.trim();
  if (trimmed.length < 2) return { error: "Nama minimal 2 karakter." };
  if (trimmed.length > 80) return { error: "Nama maksimal 80 karakter." };

  const auth = await requireSuperAdmin();
  if (!auth.ok) return { error: auth.error };

  // Append to the end of the list; spacing by 10 leaves room to reorder later.
  const { data: last } = await auth.supabase
    .from("reference_values")
    .select("sort_order")
    .eq("kind", kind)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await auth.supabase.from("reference_values").insert({
    kind,
    name: trimmed,
    slug: slugify(trimmed),
    sort_order: (last?.sort_order ?? 0) + 10,
  });

  if (error) {
    if (error.code === "23505") return { error: `"${trimmed}" sudah ada dalam daftar.` };
    return { error: "Gagal menambahkan data." };
  }

  revalidateReference(kind);
  return { success: true };
}

/**
 * Renames an entry, and rewrites the member/business rows that referenced the
 * old name.
 *
 * Those columns store the label as free text, not a foreign key, so a rename
 * without this backfill silently orphans every existing record — a member in
 * "Yogyakarta" would vanish from a renamed "Yogya" filter. The two writes are
 * not one transaction: if the backfill fails the administrator is told to
 * retry rather than being told a half-done rename succeeded.
 */
export async function renameReferenceValue(
  id: string,
  name: string,
): Promise<ActionResult> {
  const trimmed = name.trim();
  if (trimmed.length < 2) return { error: "Nama minimal 2 karakter." };
  if (trimmed.length > 80) return { error: "Nama maksimal 80 karakter." };

  const auth = await requireSuperAdmin();
  if (!auth.ok) return { error: auth.error };

  const { data: current } = await auth.supabase
    .from("reference_values")
    .select("kind, name")
    .eq("id", id)
    .maybeSingle();

  if (!current) return { error: "Data tidak ditemukan." };
  if (!isKind(current.kind)) return { error: "Jenis daftar tidak valid." };
  if (current.name === trimmed) return { success: true };

  const { error } = await auth.supabase
    .from("reference_values")
    .update({ name: trimmed, slug: slugify(trimmed) })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") return { error: `"${trimmed}" sudah ada dalam daftar.` };
    return { error: "Gagal menyimpan perubahan." };
  }

  const backfill = await backfillRename(auth.supabase, current.kind, current.name, trimmed);
  if (backfill) return backfill;

  revalidateReference(current.kind);
  return { success: true };
}

/** Points existing records at the new label after a rename. */
async function backfillRename(
  supabase: Awaited<ReturnType<typeof createClient>>,
  kind: ReferenceKind,
  from: string,
  to: string,
): Promise<{ error: string } | null> {
  const failed = "Nama diubah, tetapi data lama gagal diperbarui. Coba ubah ulang.";

  if (kind === "korwil") {
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ korwil: to })
      .eq("korwil", from);
    if (profileError) return { error: failed };

    // Admins administering the renamed region must move with it, or their
    // scope silently resolves to nothing.
    const { error: managedError } = await supabase
      .from("profiles")
      .update({ managed_korwil: to })
      .eq("managed_korwil", from);
    if (managedError) return { error: failed };
    return null;
  }

  if (kind === "industry") {
    const { error } = await supabase
      .from("businesses")
      .update({ industry: to })
      .eq("industry", from);
    return error ? { error: failed } : null;
  }

  // product_category labels both a business's headline category and a product.
  const { error: productError } = await supabase
    .from("products")
    .update({ category: to })
    .eq("category", from);
  if (productError) return { error: failed };

  const { error: businessError } = await supabase
    .from("businesses")
    .update({ product_category: to })
    .eq("product_category", from);
  return businessError ? { error: failed } : null;
}

/**
 * Retires or restores an entry.
 *
 * Retiring hides it from pickers but leaves existing records untouched — the
 * alternative, deleting, would strip the value from every member who chose it.
 */
export async function setReferenceValueActive(
  id: string,
  isActive: boolean,
): Promise<ActionResult> {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return { error: auth.error };

  const { data: current } = await auth.supabase
    .from("reference_values")
    .select("kind")
    .eq("id", id)
    .maybeSingle();

  if (!current) return { error: "Data tidak ditemukan." };

  const { error } = await auth.supabase
    .from("reference_values")
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) return { error: "Gagal memperbarui status." };

  if (isKind(current.kind)) revalidateReference(current.kind);
  return { success: true };
}

/**
 * Permanently deletes an entry — refused while any record still uses it.
 *
 * Retiring is the usual answer; delete exists for typos added by mistake.
 */
export async function deleteReferenceValue(id: string): Promise<ActionResult> {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return { error: auth.error };

  const { data: current } = await auth.supabase
    .from("reference_values")
    .select("kind, name")
    .eq("id", id)
    .maybeSingle();

  if (!current) return { error: "Data tidak ditemukan." };
  if (!isKind(current.kind)) return { error: "Jenis daftar tidak valid." };

  const used = await countUsage(auth.supabase, current.kind, current.name);
  if (used > 0) {
    return {
      error: `Masih dipakai oleh ${used} data. Nonaktifkan saja agar data lama tetap utuh.`,
    };
  }

  const { error } = await auth.supabase.from("reference_values").delete().eq("id", id);
  if (error) return { error: "Gagal menghapus data." };

  revalidateReference(current.kind);
  return { success: true };
}

/** How many existing records reference this label. */
async function countUsage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  kind: ReferenceKind,
  name: string,
): Promise<number> {
  const head = { count: "exact" as const, head: true };

  if (kind === "korwil") {
    const { count } = await supabase
      .from("profiles")
      .select("id", head)
      .eq("korwil", name);
    return count ?? 0;
  }

  if (kind === "industry") {
    const { count } = await supabase
      .from("businesses")
      .select("id", head)
      .eq("industry", name);
    return count ?? 0;
  }

  const { count: products } = await supabase
    .from("products")
    .select("id", head)
    .eq("category", name);
  const { count: businesses } = await supabase
    .from("businesses")
    .select("id", head)
    .eq("product_category", name);
  return (products ?? 0) + (businesses ?? 0);
}

/* ----------------------------------------------------------- Site settings */

/** Settings stored as "true"/"false" and rendered as checkboxes. */
const BOOLEAN_KEYS: SettingKey[] = ["registration_open", "auto_approve_members"];

export async function updateSiteSettings(formData: FormData): Promise<ActionResult> {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return { error: auth.error };

  const rows = SETTING_KEYS.map((key) => ({
    key,
    // An unchecked checkbox is absent from FormData, so read presence rather
    // than trusting a submitted value.
    value: BOOLEAN_KEYS.includes(key)
      ? String(formData.get(key) === "on")
      : String(formData.get(key) ?? "").trim().slice(0, 500),
    updated_by: auth.ctx.userId,
  }));

  const email = rows.find((row) => row.key === "org_email")?.value ?? "";
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Alamat email tidak valid." };
  }

  const { error } = await auth.supabase
    .from("site_settings")
    .upsert(rows, { onConflict: "key" });

  if (error) return { error: "Gagal menyimpan pengaturan." };

  revalidatePath("/admin/pengaturan");
  revalidatePath("/", "layout");
  return { success: true };
}

/* -------------------------------------------------------------- Korwil list */

/** The korwil options a super admin may assign, read from the live list. */
export async function assignableKorwil(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reference_values")
    .select("name")
    .eq("kind", "korwil")
    .eq("is_active", true)
    .order("sort_order");

  const names = (data ?? []).map((row) => row.name as string);
  return names.length > 0 ? names : [...KORWIL];
}
