import Link from "next/link";
import { Mail, Phone, MapPin } from "lucide-react";
import { NAV, ORG } from "@/content/site";

export function SiteFooter() {
  return (
    <footer className="bg-maroon-950 text-white/80">
      <div className="gold-rule" />
      <div className="shell grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="mb-4 flex items-center gap-3">
            <div className="bg-gold-grad grid h-11 w-11 place-items-center rounded-xl font-extrabold text-maroon-900">
              K
            </div>
            <div className="font-display text-lg font-extrabold text-white">
              {ORG.short}
            </div>
          </div>
          <p className="text-sm leading-relaxed">{ORG.description}</p>
        </div>

        <div>
          <h2 className="mb-4 font-display font-bold text-white">Navigasi</h2>
          <ul className="space-y-2 text-sm">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="transition-colors hover:text-gold-300">
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="mb-4 font-display font-bold text-white">Keanggotaan</h2>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/daftar" className="transition-colors hover:text-gold-300">
                Daftar Anggota
              </Link>
            </li>
            <li>
              <Link href="/masuk" className="transition-colors hover:text-gold-300">
                Masuk
              </Link>
            </li>
            <li>
              <Link href="/bisnis" className="transition-colors hover:text-gold-300">
                Direktori Bisnis
              </Link>
            </li>
            <li>
              <Link href="/produk" className="transition-colors hover:text-gold-300">
                Katalog Produk
              </Link>
            </li>
            <li>
              <Link href="/berita" className="transition-colors hover:text-gold-300">
                Berita &amp; Acara
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="mb-4 font-display font-bold text-white">Kontak</h2>
          <ul className="space-y-3 text-sm">
            <li className="flex gap-3">
              <MapPin size={18} className="shrink-0 text-gold-500" />
              {ORG.address}
            </li>
            <li className="flex gap-3">
              <Mail size={18} className="shrink-0 text-gold-500" />
              <a href={`mailto:${ORG.email}`} className="hover:text-gold-300">
                {ORG.email}
              </a>
            </li>
            <li className="flex gap-3">
              <Phone size={18} className="shrink-0 text-gold-500" />
              {ORG.phone}
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="shell flex flex-col items-center justify-between gap-2 py-5 text-xs text-white/60 sm:flex-row">
          <span>
            © {new Date().getFullYear()} {ORG.full}. Seluruh hak cipta dilindungi.
          </span>
          <span>Sejak {ORG.founded}</span>
        </div>
      </div>
    </footer>
  );
}
