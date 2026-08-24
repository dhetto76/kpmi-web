import type { SupabaseClient } from "@supabase/supabase-js";
import type { AdminContext } from "@/lib/auth.server";
import { slugify } from "@/lib/utils";

/**
 * Shared scoping helpers for the admin actions.
 *
 * These were private functions inside `admin/actions.ts`. React Router puts
 * each action in its own route module, so the checks they all shared live here.
 *
 * A super_admin acts platform-wide. An admin_korwil acts only on members and
 * businesses whose owner belongs to their region; these checks produce a clear
 * message, and RLS enforces the same rule regardless.
 */

export const OUT_OF_SCOPE = "Di luar wilayah korwil Anda.";

/** Matches a v1–v5 UUID. Ids arriving from a form are never trusted. */
export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const STATUSES = ["pending", "approved", "rejected"] as const;
export type Status = (typeof STATUSES)[number];

export function isStatus(value: unknown): value is Status {
  return typeof value === "string" && (STATUSES as readonly string[]).includes(value);
}

const ROLES = ["member", "admin_korwil", "super_admin"] as const;
export type GrantableRole = (typeof ROLES)[number];

export function isRole(value: unknown): value is GrantableRole {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

/** Turns empty form strings into nulls so the database stores NULL, not "". */
export function clean<T extends Record<string, unknown>>(obj: T) {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k, v === "" ? null : v]),
  );
}

/**
 * Supabase returns an embedded to-one relation as an object, but the generated
 * types widen it to an array. Both shapes appear in practice depending on the
 * query, so unwrap defensively rather than casting.
 */
function one<T>(value: T | T[] | null | undefined): T | undefined {
  return Array.isArray(value) ? value[0] : (value ?? undefined);
}

/**
 * Null when the caller may administer this member, an error otherwise.
 *
 * Scope is the member's OWN korwil (profiles.korwil), not managed_korwil — the
 * region a member belongs to is what a korwil admin oversees. The matching RLS
 * policy is "korwil admins update profiles in their region".
 */
export async function scopedProfile(
  supabase: SupabaseClient,
  ctx: AdminContext,
  id: string,
): Promise<{ error: string } | null> {
  if (!UUID_RE.test(id)) return { error: "ID anggota tidak valid." };

  const { data } = await supabase
    .from("profiles")
    .select("korwil")
    .eq("id", id)
    .maybeSingle();

  if (!data) return { error: "Anggota tidak ditemukan." };

  if (!ctx.isSuperAdmin && (!ctx.managedKorwil || data.korwil !== ctx.managedKorwil)) {
    return { error: OUT_OF_SCOPE };
  }

  return null;
}

/** Null when the caller may administer this business, an error otherwise. */
export async function scopedBusiness(
  supabase: SupabaseClient,
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
    const owner = one(data.owner as { korwil: string | null } | { korwil: string | null }[]);
    if (owner?.korwil !== ctx.managedKorwil) return { error: OUT_OF_SCOPE };
  }

  return null;
}

/** Same check for a product, resolved through its parent business. */
export async function scopedProduct(
  supabase: SupabaseClient,
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
    const business = one(data.business as { owner: unknown } | { owner: unknown }[]);
    const owner = one(business?.owner as { korwil: string | null } | { korwil: string | null }[]);
    if (owner?.korwil !== ctx.managedKorwil) return { error: OUT_OF_SCOPE };
  }

  return null;
}

/** Appends a short suffix if the slug is taken, so names may repeat. */
export async function uniqueBusinessSlug(
  supabase: SupabaseClient,
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

/**
 * Assigns a role. Super admin only — a korwil admin cannot mint other admins,
 * so a single compromised regional account cannot multiply itself.
 *
 * `managedKorwil` is required for admin_korwil and must be null otherwise; the
 * profiles_managed_korwil_check constraint enforces the same pairing.
 *
 * Shared by /admin/anggota and /admin/pengguna, which both grant roles. A
 * duplicated privilege check is one that can drift out of agreement with
 * itself, so there is exactly one copy.
 */
export async function grantRole(
  supabase: SupabaseClient,
  ctx: AdminContext,
  input: { id: string; role: unknown; managedKorwil: string },
  korwilOptions: readonly string[],
): Promise<{ error: string; status: number } | null> {
  if (!UUID_RE.test(input.id)) return { error: "ID anggota tidak valid.", status: 400 };
  if (!isRole(input.role)) return { error: "Peran tidak valid.", status: 400 };
  if (!ctx.isSuperAdmin) {
    return { error: "Hanya Super Admin yang dapat mengubah peran.", status: 403 };
  }

  // Removing your own super admin rights could leave the platform with no
  // administrator at all, and you could not undo it.
  if (input.id === ctx.userId && input.role !== "super_admin") {
    return { error: "Anda tidak dapat menurunkan peran Anda sendiri.", status: 403 };
  }

  let region: string | null = null;
  if (input.role === "admin_korwil") {
    if (!input.managedKorwil) {
      return { error: "Pilih wilayah korwil untuk Admin Korwil.", status: 400 };
    }
    if (!korwilOptions.includes(input.managedKorwil)) {
      return { error: "Wilayah korwil tidak valid.", status: 400 };
    }
    region = input.managedKorwil;
  }

  const { error } = await supabase
    .from("profiles")
    .update({ role: input.role, managed_korwil: region })
    .eq("id", input.id);

  if (error) return { error: "Gagal memperbarui peran.", status: 500 };
  return null;
}
