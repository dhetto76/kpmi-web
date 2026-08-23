import type { SupabaseClient } from "@supabase/supabase-js";
import { slugify } from "@/lib/utils";

/**
 * Shared helpers for the member write paths.
 *
 * These were private functions inside `dashboard/actions.ts`, which was one
 * module of Server Actions. React Router puts each action in its own route
 * module, so the pieces they all needed live here instead.
 *
 * Every write also passes through RLS, so ownership is enforced twice: the
 * explicit checks give a clear error message, and the database policies
 * guarantee correctness even if a check here were wrong.
 */

/** Turns empty form strings into nulls so the database stores NULL, not "". */
export function clean<T extends Record<string, unknown>>(obj: T) {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k, v === "" ? null : v]),
  );
}

/** Appends a short suffix if the slug is taken, so names may repeat. */
export async function uniqueBusinessSlug(
  supabase: SupabaseClient,
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

/** Confirms the caller owns the business a product belongs to. */
export async function ownsBusiness(
  supabase: SupabaseClient,
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

/**
 * Reads the checkbox and multi-value fields a plain FormData cannot express.
 *
 * An unchecked HTML checkbox submits nothing at all, so `formData.get()`
 * returns null rather than false — every caller has to translate that, and
 * forgetting to silently stores null instead of false.
 */
export function businessFormValues(formData: FormData) {
  return {
    ...Object.fromEntries(formData),
    has_branches: formData.get("has_branches") === "on",
    has_marketing_team: formData.get("has_marketing_team") === "on",
  };
}

export function productFormValues(formData: FormData) {
  return {
    ...Object.fromEntries(formData),
    // Repeated fields of the same name; getAll reads them back as an array.
    images: formData.getAll("images").filter(Boolean) as string[],
    is_published: formData.get("is_published") === "on",
  };
}
