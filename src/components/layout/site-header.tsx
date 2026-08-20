"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ChevronDown, LayoutDashboard } from "lucide-react";
import { NAV, ORG } from "@/content/site";
import { cn } from "@/lib/utils";

export function SiteHeader({ isSignedIn = false }: { isSignedIn?: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const pathname = usePathname();

  // Reset the drawer during render when the route changes, rather than in an
  // effect — avoids the extra render pass a post-navigation setState causes.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
    setExpanded(null);
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const solid = scrolled || open;

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        solid ? "bg-white/95 shadow-lg backdrop-blur" : "bg-transparent",
      )}
    >
      <div className="shell flex h-18 items-center justify-between gap-4">
        <Link href="/" className="flex shrink-0 items-center gap-3">
          <div className="bg-gold-grad grid h-11 w-11 place-items-center rounded-xl font-extrabold text-maroon-900 shadow-md">
            K
          </div>
          <div className="leading-tight">
            <div
              className={cn(
                "font-display text-lg font-extrabold tracking-tight",
                solid ? "text-maroon-600" : "text-white",
              )}
            >
              {ORG.short}
            </div>
            <div
              className={cn(
                "text-[10px] font-medium uppercase tracking-[.14em]",
                solid ? "text-gray-500" : "text-white/70",
              )}
            >
              Pengusaha Muslim
            </div>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));

            return (
              <div key={item.href} className="group relative">
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                    solid
                      ? active
                        ? "text-maroon-600"
                        : "text-gray-700 hover:text-maroon-600"
                      : active
                        ? "text-gold-300"
                        : "text-white/90 hover:text-gold-300",
                  )}
                >
                  {item.label}
                  {item.children && (
                    <ChevronDown
                      size={14}
                      className="transition-transform group-hover:rotate-180"
                    />
                  )}
                </Link>

                {item.children && (
                  <div className="invisible absolute left-0 top-full w-60 translate-y-1 opacity-0 transition-all duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                    <div className="mt-2 overflow-hidden rounded-xl border border-gray-100 bg-white py-2 shadow-xl">
                      {item.children.map((c) => (
                        <Link
                          key={c.href}
                          href={c.href}
                          className="block px-4 py-2.5 text-sm text-gray-700 transition-colors hover:bg-maroon-50 hover:text-maroon-600"
                        >
                          {c.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {isSignedIn ? (
            <Link
              href="/dashboard"
              className="bg-maroon-bright ml-2 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-white shadow-md transition-transform hover:-translate-y-0.5"
            >
              <LayoutDashboard size={16} />
              Dashboard
            </Link>
          ) : (
            <div className="ml-2 flex items-center gap-2">
              <Link
                href="/masuk"
                className={cn(
                  "rounded-full px-4 py-2.5 text-sm font-semibold transition-colors",
                  solid ? "text-maroon-600 hover:bg-maroon-50" : "text-white hover:bg-white/10",
                )}
              >
                Masuk
              </Link>
              <Link
                href="/daftar"
                className="bg-maroon-bright rounded-full px-5 py-2.5 text-sm font-bold text-white shadow-md transition-transform hover:-translate-y-0.5"
              >
                Daftar
              </Link>
            </div>
          )}
        </nav>

        <button
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Tutup menu" : "Buka menu"}
          aria-expanded={open}
          className={cn("lg:hidden", solid ? "text-maroon-600" : "text-white")}
        >
          {open ? <X size={26} /> : <Menu size={26} />}
        </button>
      </div>

      {open && (
        <div className="border-t border-gray-100 bg-white shadow-xl lg:hidden">
          <div className="shell max-h-[70vh] space-y-1 overflow-y-auto py-4">
            {NAV.map((item) => (
              <div key={item.href} className="border-b border-gray-100 last:border-0">
                <div className="flex items-center justify-between">
                  <Link href={item.href} className="flex-1 py-3 font-semibold text-gray-800">
                    {item.label}
                  </Link>
                  {item.children && (
                    <button
                      onClick={() =>
                        setExpanded(expanded === item.href ? null : item.href)
                      }
                      aria-label={`Buka submenu ${item.label}`}
                      className="p-2 text-gray-500"
                    >
                      <ChevronDown
                        size={18}
                        className={cn(
                          "transition-transform",
                          expanded === item.href && "rotate-180",
                        )}
                      />
                    </button>
                  )}
                </div>
                {item.children && expanded === item.href && (
                  <div className="pb-2 pl-4">
                    {item.children.map((c) => (
                      <Link
                        key={c.href}
                        href={c.href}
                        className="block py-2 text-sm text-gray-600"
                      >
                        {c.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}

            <div className="flex gap-3 pt-3">
              {isSignedIn ? (
                <Link
                  href="/dashboard"
                  className="bg-maroon-bright flex-1 rounded-full py-3 text-center font-bold text-white"
                >
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/masuk"
                    className="flex-1 rounded-full border-2 border-maroon-600 py-3 text-center font-bold text-maroon-600"
                  >
                    Masuk
                  </Link>
                  <Link
                    href="/daftar"
                    className="bg-maroon-bright flex-1 rounded-full py-3 text-center font-bold text-white"
                  >
                    Daftar
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
