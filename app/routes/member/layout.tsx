import { Link, Outlet, data } from "react-router";
import type { Route } from "./+types/layout";
import { requireUser, isAdminRole } from "@/lib/auth.server";
import { DashboardNav } from "@/components/layout/dashboard-nav";
import { StatusBadge } from "@/components/ui";
import { ORG } from "@/content/site";
import type { UserRole } from "@/types/database";

/**
 * Guards the whole member area.
 *
 * Next.js checked this twice — once in middleware, once here. There is no
 * middleware now, so this is the only gate for every `/dashboard/*` route:
 * a child route that needs the user reads it from here rather than
 * re-authenticating, but any child performing a *write* must guard itself
 * again, since actions do not run parent loaders.
 */
export async function loader({ request }: Route.LoaderArgs) {
  const { user, supabase, headers } = await requireUser(request);

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, status, avatar_url")
    .eq("id", user.id)
    .single();

  return data(
    {
      userId: user.id,
      email: user.email ?? "",
      fullName: profile?.full_name ?? null,
      status: profile?.status ?? null,
      isAdmin: isAdminRole(profile?.role as UserRole | undefined),
    },
    { headers },
  );
}

export default function DashboardLayout({ loaderData }: Route.ComponentProps) {
  const { email, fullName, status, isAdmin } = loaderData;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="shell flex h-16 items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="bg-gold-grad grid h-9 w-9 place-items-center rounded-lg font-extrabold text-maroon-900">
              K
            </div>
            <span className="font-display font-extrabold text-maroon-600">
              {ORG.short}
            </span>
          </Link>

          <div className="flex items-center gap-3">
            {status && <StatusBadge status={status} />}
            <span className="hidden text-sm font-semibold text-gray-700 sm:block">
              {fullName || email}
            </span>
          </div>
        </div>
      </header>

      <div className="shell grid gap-8 py-8 lg:grid-cols-[15rem_1fr]">
        <aside className="lg:sticky lg:top-8 lg:self-start">
          <DashboardNav isAdmin={isAdmin} />
        </aside>
        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
