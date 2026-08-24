import { Link, data } from "react-router";
import {
  ArrowRight, Users, BookOpen, Store, Search, ShieldCheck,
  TrendingUp, Building2, Package, Newspaper, type LucideIcon,
} from "lucide-react";
import type { Route } from "./+types/home";
import { MANFAAT, VISI } from "@/content/site";
import { getHeroSlides } from "@/lib/hero.server";
import { getAllNews } from "@/lib/news.server";
import { formatDate } from "@/lib/utils";
import { KORWIL } from "@/lib/reference-data";
import { ButtonLink, SectionTitle, Card } from "@/components/ui";
import { Image } from "@/components/ui/image";
import { HeroCarousel } from "@/components/home/hero-carousel";
import { createClient } from "@/lib/supabase/server";

const ICONS: Record<string, LucideIcon> = {
  Users, BookOpen, Store, Search, ShieldCheck, TrendingUp,
};

export async function loader({ request }: Route.LoaderArgs) {
  const { supabase, headers } = createClient(request);

  /** Counts shown in the hero. Falls back to zero before the database exists. */
  let stats = { businesses: 0, products: 0, members: 0 };
  try {
    const [businesses, products, members] = await Promise.all([
      supabase.from("businesses").select("*", { count: "exact", head: true })
        .eq("status", "approved"),
      supabase.from("products").select("*", { count: "exact", head: true })
        .eq("is_published", true),
      supabase.from("profiles").select("*", { count: "exact", head: true })
        .eq("status", "approved"),
    ]);
    stats = {
      businesses: businesses.count ?? 0,
      products: products.count ?? 0,
      members: members.count ?? 0,
    };
  } catch {
    // Keep the zeroes.
  }

  return data(
    { stats, news: getAllNews().slice(0, 3), heroSlides: await getHeroSlides(supabase) },
    { headers },
  );
}

export default function HomePage({ loaderData }: Route.ComponentProps) {
  const { stats, news, heroSlides } = loaderData;

  const tiles = [
    { value: stats.members.toLocaleString("id-ID"), label: "Anggota" },
    { value: stats.businesses.toLocaleString("id-ID"), label: "Bisnis Terdaftar" },
    { value: stats.products.toLocaleString("id-ID"), label: "Produk & Jasa" },
    { value: String(KORWIL.length), label: "Koordinator Wilayah" },
  ];

  return (
    <>
      {/* ------------------------------------------------------------ Hero */}
      <HeroCarousel slides={heroSlides}>
        <div className="mx-auto mt-16 grid max-w-4xl grid-cols-2 gap-4 lg:grid-cols-4">
          {tiles.map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-white/10 bg-white/[.07] p-6 text-center backdrop-blur-sm"
            >
              <div className="font-display text-3xl font-extrabold tabular-nums text-gold-300 sm:text-4xl">
                {s.value}
              </div>
              <div className="mt-1 text-xs font-medium uppercase tracking-wider text-white/70">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </HeroCarousel>

      {/* -------------------------------------------------------- Benefits */}
      <section className="bg-white py-24">
        <div className="shell">
          <SectionTitle
            eyebrow="Keuntungan Anggota"
            title="Mengapa Bergabung dengan KPMI?"
            desc="Wadah pengusaha Muslim untuk tumbuh bersama — dari jaringan, ilmu, hingga peluang usaha."
          />
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {MANFAAT.map((b) => {
              const Icon = ICONS[b.icon] ?? Users;
              return (
                <Card key={b.title} className="card-lift h-full p-7">
                  <div className="bg-maroon-deep mb-5 grid h-14 w-14 place-items-center rounded-xl text-gold-300 shadow-md">
                    <Icon size={26} />
                  </div>
                  <h3 className="font-display text-lg font-bold text-maroon-900">
                    {b.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-600">{b.desc}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------- Visi */}
      <section className="bg-maroon-deep pattern-geo py-20">
        <div className="shell text-center">
          <div className="mb-3 text-xs font-bold uppercase tracking-[.18em] text-gold-300">
            Visi Kami
          </div>
          <p className="mx-auto max-w-3xl font-display text-2xl font-bold leading-snug text-balance text-white sm:text-3xl">
            &ldquo;{VISI}&rdquo;
          </p>
          <div className="gold-rule mx-auto mt-8 w-24" />
        </div>
      </section>

      {/* ------------------------------------------------------- Directory */}
      <section className="bg-gray-50 py-24">
        <div className="shell">
          <SectionTitle
            eyebrow="Platform Anggota"
            title="Temukan Mitra, Tampilkan Usaha"
            desc="Direktori bisnis dan katalog produk dari sesama anggota KPMI di seluruh Indonesia."
          />
          <div className="mt-14 grid gap-6 md:grid-cols-2">
            <Link to="/bisnis" className="card-lift group block">
              <Card className="h-full overflow-hidden">
                <div className="bg-maroon-bright pattern-geo grid h-40 place-items-center">
                  <Building2 size={52} className="text-white/25" />
                </div>
                <div className="p-7">
                  <h3 className="font-display text-xl font-bold text-maroon-900 group-hover:text-maroon-600">
                    Direktori Bisnis
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-600">
                    Jelajahi usaha anggota berdasarkan sektor industri dan wilayah.
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-gold-600">
                    Lihat direktori <ArrowRight size={15} />
                  </span>
                </div>
              </Card>
            </Link>

            <Link to="/produk" className="card-lift group block">
              <Card className="h-full overflow-hidden">
                <div className="bg-maroon-bright pattern-geo grid h-40 place-items-center">
                  <Package size={52} className="text-white/25" />
                </div>
                <div className="p-7">
                  <h3 className="font-display text-xl font-bold text-maroon-900 group-hover:text-maroon-600">
                    Katalog Produk
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-600">
                    Cari produk dan layanan halal dari pengusaha anggota KPMI.
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-gold-600">
                    Lihat katalog <ArrowRight size={15} />
                  </span>
                </div>
              </Card>
            </Link>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ News */}
      {news.length > 0 && (
        <section className="bg-white py-24">
          <div className="shell">
            <SectionTitle
              eyebrow="Informasi"
              title="Berita &amp; Acara"
              desc="Kabar terbaru dan agenda kegiatan komunitas."
            />
            <div className="mt-14 grid gap-7 md:grid-cols-3">
              {news.map((item) => (
                <Link
                  key={item.slug}
                  to={`/berita/${item.slug}`}
                  className="card-lift block"
                >
                  <Card className="h-full overflow-hidden">
                    <div className="bg-maroon-deep pattern-geo relative grid h-44 place-items-center overflow-hidden">
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt=""
                          fill
                          sizes="(max-width: 768px) 100vw, 350px"
                          className="object-cover"
                        />
                      ) : (
                        <Newspaper size={32} className="text-white/25" />
                      )}
                    </div>
                    <div className="p-6">
                      <div className="mb-2 text-xs text-gray-400">
                        {formatDate(item.date)}
                      </div>
                      <h3 className="font-display text-lg font-bold leading-snug text-maroon-900">
                        {item.title}
                      </h3>
                      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-gray-600">
                        {item.excerpt}
                      </p>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
            <div className="mt-12 text-center">
              <ButtonLink href="/berita" variant="outline" size="lg">
                Lihat Semua Berita <ArrowRight size={18} />
              </ButtonLink>
            </div>
          </div>
        </section>
      )}

      {/* ------------------------------------------------------------- CTA */}
      <section className="bg-gold-grad py-20">
        <div className="shell text-center">
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-balance text-maroon-900 sm:text-4xl">
            Siap Bergabung?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-maroon-800">
            Daftarkan diri dan usaha Anda, lalu terhubung dengan pengusaha Muslim
            di {KORWIL.length} koordinator wilayah.
          </p>
          <ButtonLink
            href="/daftar"
            size="lg"
            className="bg-maroon-deep mt-8 text-white shadow-xl"
          >
            Daftar Keanggotaan <ArrowRight size={18} />
          </ButtonLink>
        </div>
      </section>
    </>
  );
}
