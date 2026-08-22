import { Shield } from "lucide-react";
import { requireAdminContext, roleLabel } from "@/lib/auth";
import { AdminNav } from "./admin-nav";

export const metadata = { title: "Panel Admin" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { role, managedKorwil } = await requireAdminContext();

  return (
    <div className="min-h-screen bg-[#fafafa] text-slate-900">
      <header className="sticky top-0 z-30 h-[60px] bg-[linear-gradient(100deg,#830000_0%,#9d0000_48%,#700000_100%)] shadow-sm">
        <div className="flex h-full items-center px-5 sm:px-7">
          <div className="flex min-w-0 items-center gap-2.5 text-white">
            <Shield size={21} strokeWidth={2.2} className="shrink-0 text-amber-300" />
            <span className="font-display text-lg font-extrabold tracking-[-0.02em]">Panel Admin</span>
            <span className="ml-1 truncate rounded-full bg-amber-500/20 px-3 py-1 text-[11px] font-bold text-amber-200 ring-1 ring-inset ring-amber-300/10">
              {roleLabel(role, managedKorwil)}
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
          {children}
        </main>
      </div>
    </div>
  );
}
