import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight, Users, BookOpen, Store, Search, ShieldCheck,
  TrendingUp, Building2, Package, Newspaper, type LucideIcon,
} from "lucide-react";
import { ORG, MANFAAT, VISI } from "@/content/site";
import { getAllNews } from "@/lib/news";
import { formatDate } from "@/lib/utils";
import { KORWIL } from "@/lib/reference-data";
import { ButtonLink, SectionTitle, Card } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";

const ICONS: Record<string, LucideIcon> = {
  Users, BookOpen, Store, Search, ShieldCheck, TrendingUp,
};

/** Counts shown in the hero. Falls back to zero before the database exists. */
async function getStats() {
  try {
    const supabase = await createClient();
    const [businesses, products, members] = await Promise.all([
      supabase.from("businesses").select("*", { count: "exact", head: true })
        .eq("status", "approved"),
      supabase.from("products").select("*", { count: "exact", head: true })
        .eq("is_published", true),
      supabase.from("profiles").select("*", { count: "exact", head: true })
        .eq("status", "approved"),
    ]);
    return {
      businesses: businesses.count ?? 0,
      products: products.count ?? 0,
      members: members.count ?? 0,
    };
  } catch {
    return { businesses: 0, products: 0, members: 0 };
  }
}

export default async function HomePage() {
  const stats = await getStats();
  const news = getAllNews().slice(0, 3);

  const tiles = [
    { value: stats.members.toLocaleString("id-ID"), label: "Anggota" },
    { value: stats.businesses.toLocaleString("id-ID"), label: "Bisnis Terdaftar" },
    { value: stats.products.toLocaleString("id-ID"), label: "Produk & Jasa" },
    { value: String(KORWIL.length), label: "Koordinator Wilayah" },
  ];

  return (
    <>
      {/* ------------------------------------------------------------ Hero */}
      <section className="bg-maroon-deep pattern-geo relative flex min-h-[88vh] items-center overflow-hidden pt-28">
        <div className="pointer-events-none absolute -right-40 top-1/4 h-[30rem] w-[30rem] rounded-full bg-gold-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -left-40 bottom-0 h-96 w-96 rounded-full bg-maroon-400/25 blur-3xl" />

        <div className="shell relative grid items-center gap-14 py-20 lg:grid-cols-2">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-gold-500/40 bg-white/5 px-4 py-1.5 text-xs font-semibold text-gold-300 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-gold-300" />
              Sejak {ORG.founded} · {ORG.full}
            </div>

            <h1 className="font-display text-4xl font-extrabold leading-[1.1] tracking-tight text-balance text-white sm:text-5xl lg:text-6xl">
              Membangun Bisnis yang{" "}
              <span className="text-gold-grad">Halal &amp; Berkah</span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/75">
              {ORG.tagline}
            </p>

            <div className="mt-9 flex flex-wrap gap-4">
              <ButtonLink href="/daftar" variant="gold" size="lg">
                Gabung Sekarang <ArrowRight size={18} />
              </ButtonLink>
              <Link
                href="/bisnis"
                className="inline-flex items-center gap-2 rounded-full border-2 border-white/25 px-8 py-3.5 font-bold text-white transition-colors hover:bg-white/10"
              >
                Jelajahi Direktori
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
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
        </div>
      </section>

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
            <Link href="/bisnis" className="card-lift group block">
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

            <Link href="/produk" className="card-lift group block">
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
                  href={`/berita/${item.slug}`}
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
