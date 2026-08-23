import type { SupabaseClient } from "@supabase/supabase-js";
import {
  REFERENCE_KINDS,
  type ReferenceKind,
  type ReferenceValue,
} from "@/lib/settings.server";
import { KORWIL } from "@/lib/reference-data";

/**
 * Reference-list helpers shared by the korwil / kategori / industri routes.
 *
 * Every write through these is super-admin only. A korwil admin editing the
 * korwil list could invent a region and hand it to themselves, and settings
 * are global by definition — neither is regional work. RLS enforces the same
 * rule, so a bypass of the caller's check still fails at the database.
 */

export const SUPER_ADMIN_ONLY = "Hanya Super Admin yang dapat mengubah pengaturan.";

export function isKind(value: unknown): value is ReferenceKind {
  return typeof value === "string" && (REFERENCE_KINDS as readonly string[]).includes(value);
}

/**
 * How many records use each entry, so the UI can warn before a rename and
 * block a delete that would orphan data.
 *
 * Counted with one grouped read per source rather than a count query per row:
 * korwil alone has 45 entries, which would otherwise be 45 roundtrips.
 */
export async function usageCounts(
  supabase: SupabaseClient,
  kind: ReferenceKind,
  values: ReferenceValue[],
): Promise<Record<string, number>> {
  const tally = new Map<string, number>();

  const add = (name: string | null) => {
    if (!name) return;
    tally.set(name, (tally.get(name) ?? 0) + 1);
  };

  if (kind === "korwil") {
    const { data } = await supabase.from("profiles").select("korwil");
    for (const row of data ?? []) add(row.korwil);
  } else if (kind === "industry") {
    const { data } = await supabase.from("businesses").select("industry");
    for (const row of data ?? []) add(row.industry);
  } else {
    const { data: products } = await supabase.from("products").select("category");
    for (const row of products ?? []) add(row.category);
    const { data: businesses } = await supabase.from("businesses").select("product_category");
    for (const row of businesses ?? []) add(row.product_category);
  }

  // Keyed by row id, which is what the list component looks up.
  return Object.fromEntries(
    values.map((value) => [value.id, tally.get(value.name) ?? 0]),
  );
}

/** How many existing records reference one label. */
export async function countUsage(
  supabase: SupabaseClient,
  kind: ReferenceKind,
  name: string,
): Promise<number> {
  const head = { count: "exact" as const, head: true };

  if (kind === "korwil") {
    const { count } = await supabase.from("profiles").select("id", head).eq("korwil", name);
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

/**
 * Points existing records at the new label after a rename.
 *
 * Those columns store the label as free text, not a foreign key, so a rename
 * without this backfill silently orphans every existing record — a member in
 * "Yogyakarta" would vanish from a renamed "Yogya" filter. The two writes are
 * not one transaction: if the backfill fails the administrator is told to
 * retry rather than being told a half-done rename succeeded.
 */
export async function backfillRename(
  supabase: SupabaseClient,
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

/** The korwil options a super admin may assign, read from the live list. */
export async function assignableKorwil(supabase: SupabaseClient): Promise<string[]> {
  const { data } = await supabase
    .from("reference_values")
    .select("name")
    .eq("kind", "korwil")
    .eq("is_active", true)
    .order("sort_order");

  const names = (data ?? []).map((row) => row.name as string);
  return names.length > 0 ? names : [...KORWIL];
}
