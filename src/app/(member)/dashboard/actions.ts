"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { profileSchema, businessSchema, productSchema } from "@/lib/validations";
import { slugify } from "@/lib/utils";

export type ActionResult = { error: string } | { success: true };

/**
 * Member CRUD actions.
 *
 * Every write also passes through RLS, so ownership is enforced twice: the
 * explicit checks here give a clear error message, and the database policies
 * guarantee correctness even if a check here were wrong.
 */

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/masuk");
  return { supabase, user };
}

/** Turns empty form strings into nulls so the database stores NULL, not "". */
function clean<T extends Record<string, unknown>>(obj: T) {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k, v === "" ? null : v]),
  );
}

/* --------------------------------------------------------------- Profile */

export async function updateProfile(formData: FormData): Promise<ActionResult> {
  const { supabase, user } = await requireUser();

  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { error } = await supabase
    .from("profiles")
    .update(clean(parsed.data))
    .eq("id", user.id);

  if (error) return { error: "Gagal menyimpan profil. Silakan coba lagi." };

  revalidatePath("/dashboard/profil");
  return { success: true };
}

/* -------------------------------------------------------------- Business */

/** Appends a short suffix if the slug is taken, so names may repeat. */
async function uniqueBusinessSlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  name: string,
  ignoreId?: string,
) {
  const base = slugify(name);
  let slug = base;

  for (let i = 0; i < 20; i++) {
    const query = supabase.from("businesses").select("id").eq("slug", slug);
    if (ignoreId) query.neq("id", ignoreId);
    const { data } = await query.maybeSingle();
    if (!data) return slug;
    slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export async function createBusiness(formData: FormData): Promise<ActionResult> {
  const { supabase, user } = await requireUser();

  const raw = Object.fromEntries(formData);
  const parsed = businessSchema.safeParse({
    ...raw,
    has_branches: formData.get("has_branches") === "on",
    has_marketing_team: formData.get("has_marketing_team") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const slug = await uniqueBusinessSlug(supabase, parsed.data.name);

  const { error } = await supabase
    .from("businesses")
    .insert({ ...clean(parsed.data), slug, owner_id: user.id });

  if (error) return { error: "Gagal menyimpan usaha. Silakan coba lagi." };

  revalidatePath("/dashboard/bisnis");
  redirect("/dashboard/bisnis");
}

export async function updateBusiness(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  const { supabase, user } = await requireUser();

  const parsed = businessSchema.safeParse({
    ...Object.fromEntries(formData),
    has_branches: formData.get("has_branches") === "on",
    has_marketing_team: formData.get("has_marketing_team") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // Explicit ownership check for a clear message; RLS enforces it regardless.
  const { data: owned } = await supabase
    .from("businesses")
    .select("id")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!owned) return { error: "Usaha tidak ditemukan." };

  const { error } = await supabase
    .from("businesses")
    .update(clean(parsed.data))
    .eq("id", id);

  if (error) return { error: "Gagal menyimpan perubahan." };

  revalidatePath("/dashboard/bisnis");
  revalidatePath(`/dashboard/bisnis/${id}`);
  return { success: true };
}

export async function deleteBusiness(id: string): Promise<ActionResult> {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("businesses")
    .delete()
    .eq("id", id)
    .eq("owner_id", user.id);

  if (error) return { error: "Gagal menghapus usaha." };

  revalidatePath("/dashboard/bisnis");
  return { success: true };
}

/* --------------------------------------------------------------- Product */

/** Confirms the caller owns the business a product belongs to. */
async function assertOwnsBusiness(
  supabase: Awaited<ReturnType<typeof createClient>>,
  businessId: string,
  userId: string,
) {
  const { data } = await supabase
    .from("businesses")
    .select("id")
    .eq("id", businessId)
    .eq("owner_id", userId)
    .maybeSingle();
  return !!data;
}

export async function createProduct(
  businessId: string,
  formData: FormData,
): Promise<ActionResult> {
  const { supabase, user } = await requireUser();

  if (!(await assertOwnsBusiness(supabase, businessId, user.id))) {
    return { error: "Usaha tidak ditemukan." };
  }

  const parsed = productSchema.safeParse({
    ...Object.fromEntries(formData),
    is_published: formData.get("is_published") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { error } = await supabase.from("products").insert({
    ...clean(parsed.data),
    slug: slugify(parsed.data.name),
    business_id: businessId,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "Produk dengan nama itu sudah ada pada usaha ini." };
    }
    return { error: "Gagal menyimpan produk." };
  }

  revalidatePath("/dashboard/produk");
  redirect("/dashboard/produk");
}

export async function updateProduct(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  const { supabase } = await requireUser();

  const parsed = productSchema.safeParse({
    ...Object.fromEntries(formData),
    is_published: formData.get("is_published") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // RLS restricts this update to products the caller owns.
  const { error } = await supabase
    .from("products")
    .update(clean(parsed.data))
    .eq("id", id);

  if (error) return { error: "Gagal menyimpan perubahan." };

  revalidatePath("/dashboard/produk");
  return { success: true };
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  const { supabase } = await requireUser();

  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) return { error: "Gagal menghapus produk." };

  revalidatePath("/dashboard/produk");
  return { success: true };
}
