import { redirect } from "react-router";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database";

/**
 * Role helpers and route guards.
 *
 * The database is the authority — every rule here is also enforced by RLS.
 * These exist so the UI can hide what a user cannot do and show clear errors,
 * not as the security boundary.
 *
 * Next.js ran the route checks once in middleware for every `/dashboard` and
 * `/admin` request. React Router has no middleware, so each protected loader
 * and action calls a guard itself. That is more explicit but also easier to
 * forget — a route with no guard is simply unprotected.
 *
 * Every guard returns the `headers` from the Supabase client. Callers MUST
 * pass them through on the response, or a refreshed session cookie is dropped
 * and the user is silently signed out on a later request.
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

/** Reads the session without requiring one. For layouts that vary by sign-in. */
export async function getOptionalUser(request: Request) {
  const { supabase, headers } = createClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { user, supabase, headers };
}

/** Requires a signed-in user. Redirects to /masuk, preserving the target. */
export async function requireUser(request: Request) {
  const { supabase, headers } = createClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const path = new URL(request.url).pathname;
    throw redirect(`/masuk?next=${encodeURIComponent(path)}`, { headers });
  }

  return { user, supabase, headers };
}

/**
 * Loads the caller's admin context, redirecting if they may not be here.
 * Used by the /admin layout and every admin action.
 */
export async function requireAdminContext(request: Request) {
  const { user, supabase, headers } = await requireUser(request);

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, managed_korwil")
    .eq("id", user.id)
    .single();

  if (!isAdminRole(profile?.role)) throw redirect("/dashboard", { headers });

  const role = profile!.role as UserRole;
  const isSuperAdmin = role === "super_admin";

  const context: AdminContext = {
    userId: user.id,
    role,
    // A korwil admin without a region can administer nothing; the database
    // constraint prevents this, but treat it as no-scope rather than trusting.
    managedKorwil: isSuperAdmin ? null : (profile!.managed_korwil ?? null),
    isSuperAdmin,
  };

  return { context, supabase, headers };
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
