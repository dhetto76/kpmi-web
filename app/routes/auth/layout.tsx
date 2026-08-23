import { Link, Outlet } from "react-router";
import { ORG } from "@/content/site";

/** Centered card layout for sign-in, registration and password reset. */
export default function AuthLayout() {
  return (
    <div className="bg-maroon-deep pattern-geo flex min-h-screen flex-col items-center justify-center px-5 py-12">
      <Link to="/" className="mb-8 flex items-center gap-3">
        <div className="bg-gold-grad grid h-12 w-12 place-items-center rounded-xl text-xl font-extrabold text-maroon-900 shadow-lg">
          K
        </div>
        <div className="leading-tight">
          <div className="font-display text-xl font-extrabold text-white">{ORG.short}</div>
          <div className="text-[10px] font-medium uppercase tracking-[.14em] text-white/70">
            Pengusaha Muslim
          </div>
        </div>
      </Link>

      <div className="w-full max-w-lg">
        <Outlet />
      </div>

      <Link to="/" className="mt-8 text-sm text-white/60 transition-colors hover:text-gold-300">
        ← Kembali ke beranda
      </Link>
    </div>
  );
}
