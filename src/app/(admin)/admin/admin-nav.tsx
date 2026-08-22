"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Boxes, Building2, LayoutDashboard, MapPin, Package, Settings, Tags, UserCog, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const MAIN_NAV = [
  { href: "/admin", label: "Ringkasan", icon: LayoutDashboard, exact: true },
  { href: "/admin/anggota", label: "Anggota", icon: Users },
  { href: "/admin/bisnis", label: "Usaha", icon: Building2 },
  { href: "/admin/produk", label: "Produk", icon: Package },
];

const SETTINGS_NAV = [
  { href: "/admin/korwil", label: "Korwil", icon: MapPin },
  { href: "/admin/kategori", label: "Kategori Produk", icon: Tags },
  { href: "/admin/industri", label: "Industri", icon: Boxes },
  { href: "/admin/pengguna", label: "Pengguna", icon: UserCog },
  { href: "/admin/pengaturan", label: "Pengaturan Sistem", icon: Settings },
];

export function AdminNav({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname();

  if (compact) {
    return (
      <nav aria-label="Navigasi admin" className="flex gap-2 overflow-x-auto pb-1">
        {MAIN_NAV.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} className={cn(
              "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold",
              active ? "bg-maroon-600 text-white" : "border border-slate-200 bg-white text-slate-600",
            )}>
              <item.icon size={16} />{item.label}
            </Link>
          );
        })}
      </nav>
    );
  }

  const renderItem = (item: (typeof MAIN_NAV)[number] | (typeof SETTINGS_NAV)[number]) => {
    const exact = "exact" in item && item.exact;
    const active = exact ? pathname === item.href : pathname.startsWith(item.href);
    return (
      <Link key={item.href} href={item.href} className={cn(
        "flex items-center gap-3 rounded-lg px-3.5 py-3 text-[13px] font-semibold transition-colors",
        active
          ? "bg-[linear-gradient(100deg,#930000,#b30a0a)] text-white shadow-sm"
          : "text-slate-700 hover:bg-red-50 hover:text-maroon-600",
      )}>
        <item.icon size={18} strokeWidth={1.8} />{item.label}
      </Link>
    );
  };

  return (
    <nav aria-label="Navigasi admin" className="flex flex-col gap-1">
      {MAIN_NAV.map(renderItem)}
      <div className="mx-1 my-3 border-t border-slate-200" />
      <p className="px-3 pb-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-500">Pengaturan</p>
      {SETTINGS_NAV.map(renderItem)}
    </nav>
  );
}
