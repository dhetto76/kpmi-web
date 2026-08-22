import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database";

/**
 * Role helpers.
 *
 * The database is the authority — every rule here is also enforced by RLS.
 * These exist so the UI can hide what a user cannot do and show clear errors,
 * not as the security boundary.
 */

export const ADMIN_ROLES: readonly UserRole[] = ["super_admin", "admin_korwil"];

export type AdminContext = {
  userId: string;
  role: UserRole;
  /** Region administered, or null for a super admin (who sees everything). */
  managedKorwil: string | null;
  isSuperAdmin: boolean;
};

export function isAdminRole(role: UserRole | undefined | null): boolean {
  return !!role && ADMIN_ROLES.includes(role);
}

/**
 * Loads the caller's admin context, redirecting if they may not be here.
 * Used by the /admin layout and every admin server action.
 */
export async function requireAdminContext(): Promise<AdminContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/masuk");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, managed_korwil")
    .eq("id", user.id)
    .single();

  if (!isAdminRole(profile?.role)) redirect("/dashboard");

  const role = profile!.role as UserRole;
  const isSuperAdmin = role === "super_admin";

  return {
    userId: user.id,
    role,
    // A korwil admin without a region can administer nothing; the database
    // constraint prevents this, but treat it as no-scope rather than trusting.
    managedKorwil: isSuperAdmin ? null : (profile!.managed_korwil ?? null),
    isSuperAdmin,
  };
}

/** Human-readable role label for the admin UI. */
export function roleLabel(role: UserRole, managedKorwil?: string | null): string {
  switch (role) {
    case "super_admin":
      return "Super Admin";
    case "admin_korwil":
      return managedKorwil ? `Admin Korwil ${managedKorwil}` : "Admin Korwil";
    default:
      return "Anggota";
  }
}
