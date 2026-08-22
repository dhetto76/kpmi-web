import Link from "next/link";
import { Shield, ArrowLeft } from "lucide-react";
import { requireAdminContext, roleLabel } from "@/lib/auth";
import { AdminNav } from "./admin-nav";

export const metadata = { title: "Panel Admin" };

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { role, managedKorwil } = await requireAdminContext();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-maroon-deep">
        <div className="shell flex h-16 items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-2.5 text-white">
            <Shield size={20} className="shrink-0 text-gold-300" />
            <span className="font-display font-extrabold">Panel Admin</span>
            <span className="truncate rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-semibold text-gold-200">
              {roleLabel(role, managedKorwil)}
            </span>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-white/70 transition-colors hover:text-gold-300"
          >
            <ArrowLeft size={15} /> Dashboard
          </Link>
        </div>
      </header>

      <div className="shell grid gap-8 py-8 lg:grid-cols-[14rem_1fr]">
        <aside className="lg:sticky lg:top-8 lg:self-start">
          <AdminNav />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
