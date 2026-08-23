import { Outlet, data } from "react-router";
import { Shield } from "lucide-react";
import type { Route } from "./+types/layout";
import { requireAdminContext, roleLabel } from "@/lib/auth.server";
import { AdminNav } from "@/components/admin/admin-nav";

export const meta: Route.MetaFunction = () => [{ title: "Panel Admin | KPMI" }];

/**
 * Guards the whole admin area.
 *
 * Next.js gated `/admin` in middleware and again here. There is no middleware
 * now, so this is the only gate on the read path — and it does not cover
 * actions, which never run parent loaders. Every admin action calls
 * `requireAdminContext` itself.
 */
export async function loader({ request }: Route.LoaderArgs) {
  const { context, headers } = await requireAdminContext(request);

  return data(
    {
      label: roleLabel(context.role, context.managedKorwil),
      isSuperAdmin: context.isSuperAdmin,
    },
    { headers },
  );
}

export default function AdminLayout({ loaderData }: Route.ComponentProps) {
  return (
    <div className="min-h-screen bg-[#fafafa] text-slate-900">
      <header className="sticky top-0 z-30 h-[60px] bg-[linear-gradient(100deg,#830000_0%,#9d0000_48%,#700000_100%)] shadow-sm">
        <div className="flex h-full items-center px-5 sm:px-7">
          <div className="flex min-w-0 items-center gap-2.5 text-white">
            <Shield size={21} strokeWidth={2.2} className="shrink-0 text-amber-300" />
            <span className="font-display text-lg font-extrabold tracking-[-0.02em]">Panel Admin</span>
            <span className="ml-1 truncate rounded-full bg-amber-500/20 px-3 py-1 text-[11px] font-bold text-amber-200 ring-1 ring-inset ring-amber-300/10">
              {loaderData.label}
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto flex min-h-[calc(100vh-60px)] max-w-[1920px]">
        <aside className="hidden w-[266px] shrink-0 border-r border-slate-200/80 bg-white px-4 py-5 md:block">
          <div className="sticky top-20"><AdminNav /></div>
        </aside>
        <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-7 lg:py-6">
          <div className="mb-5 md:hidden"><AdminNav compact /></div>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
