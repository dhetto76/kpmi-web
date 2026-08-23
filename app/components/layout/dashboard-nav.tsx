
import { Form, Link, useLocation } from "react-router";
import {
  LayoutDashboard, User, Building2, Package,
  Shield, LogOut, type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Item = { href: string; label: string; icon: LucideIcon; exact?: boolean };

const MEMBER_NAV: Item[] = [
  { href: "/dashboard", label: "Ringkasan", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/profil", label: "Profil Saya", icon: User },
  { href: "/dashboard/bisnis", label: "Usaha Saya", icon: Building2 },
  { href: "/dashboard/produk", label: "Produk & Jasa", icon: Package },
];

export function DashboardNav({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = useLocation().pathname;

  const isActive = (item: Item) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  return (
    <nav className="flex flex-col gap-1">
      {MEMBER_NAV.map((item) => (
        <Link
          key={item.href}
          to={item.href}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-semibold transition-colors",
            isActive(item)
              ? "bg-maroon-600 text-white"
              : "text-gray-700 hover:bg-maroon-50 hover:text-maroon-600",
          )}
        >
          <item.icon size={18} />
          {item.label}
        </Link>
      ))}

      {isAdmin && (
        <>
          <div className="mt-4 mb-1 px-3.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
            Administrasi
          </div>
          <Link
            to="/admin"
            className={cn(
              "flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-semibold transition-colors",
              pathname.startsWith("/admin")
                ? "bg-gold-500 text-maroon-900"
                : "text-gray-700 hover:bg-amber-50 hover:text-gold-600",
            )}
          >
            <Shield size={18} />
            Panel Admin
          </Link>
        </>
      )}

      {/* POST, not a link: a GET sign-out is CSRF-triggerable. */}
      <Form method="post" action="/keluar" className="mt-4 border-t border-gray-100 pt-4">
        <button
          type="submit"
          className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-red-50 hover:text-red-600"
        >
          <LogOut size={18} />
          Keluar
        </button>
      </Form>
    </nav>
  );
}
