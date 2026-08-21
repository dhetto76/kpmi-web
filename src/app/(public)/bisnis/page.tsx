import Link from "next/link";
import Image from "next/image";
import { Search, Building2, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHero, Card, EmptyState, Input, Select } from "@/components/ui";
import { JENIS_USAHA } from "@/lib/reference-data";

export const metadata = {
  title: "Direktori Bisnis",
  description: "Jelajahi usaha anggota Komunitas Pengusaha Muslim Indonesia.",
};

export default async function BusinessDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; industry?: string; city?: string }>;
}) {
  const { q, industry, city } = await searchParams;

  const supabase = await createClient();

  // RLS already limits reads to approved rows; the filter documents intent.
  let query = supabase
    .from("businesses")
    .select("id, name, slug, description, city, industry, logo_url, cover_url")
    .eq("status", "approved")
    .order("name");

  if (q) query = query.ilike("name", `%${q}%`);
  if (industry) query = query.eq("industry", industry);
  if (city) query = query.ilike("city", `%${city}%`);

  const { data: businesses } = await query;
  const list = businesses ?? [];

  return (
    <>
      <PageHero
        title="Direktori Bisnis"
        desc="Temukan usaha anggota KPMI berdasarkan sektor industri dan wilayah."
      />

      <section className="bg-white py-14">
        <div className="shell">
          <form className="mb-10 grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
            <div className="relative">
              <Search
                size={17}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <Input
                name="q"
                defaultValue={q ?? ""}
                placeholder="Cari nama usaha…"
                className="pl-10"
              />
            </div>
            <Select name="industry" defaultValue={industry ?? ""}>
              <option value="">Semua industri</option>
              {JENIS_USAHA.map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </Select>
            <Input name="city" defaultValue={city ?? ""} placeholder="Kota" />
            <button
              type="submit"
              className="bg-maroon-bright rounded-lg px-6 py-2.5 text-sm font-bold text-white"
            >
              Cari
            </button>
          </form>

          {list.length === 0 ? (
            <EmptyState
              title="Belum ada usaha yang cocok"
              desc={
                q || industry || city
                  ? "Coba ubah kata kunci atau filter pencarian."
                  : "Direktori akan terisi seiring anggota mendaftarkan usahanya."
              }
            />
          ) : (
            <>
              <p className="mb-5 text-sm text-gray-500">
                Menampilkan {list.length} usaha
              </p>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((b) => (
                  <Link key={b.id} href={`/bisnis/${b.slug}`} className="card-lift block">
                    <Card className="h-full overflow-hidden">
                      <div className="bg-maroon-deep pattern-geo relative grid h-32 place-items-center overflow-hidden">
                        {b.cover_url || b.logo_url ? (
                          <Image
                            src={(b.cover_url ?? b.logo_url)!}
                            alt=""
                            fill
                            sizes="(max-width: 768px) 100vw, 350px"
                            className="object-cover"
                          />
                        ) : (
                          <Building2 size={36} className="text-white/25" />
                        )}
                      </div>
                      <div className="p-5">
                        <h2 className="font-display font-bold text-maroon-900">{b.name}</h2>
                        <p className="mt-1.5 line-clamp-2 text-sm text-gray-600">
                          {b.description || "Belum ada deskripsi."}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                          {b.industry && (
                            <span className="rounded-full bg-maroon-50 px-2.5 py-1 font-medium text-maroon-600">
                              {b.industry}
                            </span>
                          )}
                          {b.city && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin size={12} /> {b.city}
                            </span>
                          )}
                        </div>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
}
