import Link from "next/link";
import { Search, Package, Building2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHero, Card, EmptyState, Input, Select, Badge } from "@/components/ui";
import { PRODUCT_CATEGORY } from "@/lib/reference-data";
import { formatPrice } from "@/lib/utils";

export const metadata = {
  title: "Katalog Produk",
  description: "Produk dan layanan halal dari anggota Komunitas Pengusaha Muslim Indonesia.",
};

export default async function ProductCatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const { q, category } = await searchParams;

  const supabase = await createClient();

  // RLS returns only published products whose business is approved.
  let query = supabase
    .from("products")
    .select(
      "id, name, description, price, price_unit, category, business:businesses!inner(id, name, slug, city)",
    )
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  if (q) query = query.ilike("name", `%${q}%`);
  if (category) query = query.eq("category", category);

  const { data: products } = await query;
  const list = products ?? [];

  return (
    <>
      <PageHero
        title="Katalog Produk"
        desc="Produk dan layanan halal dari para pengusaha anggota KPMI."
      />

      <section className="bg-white py-14">
        <div className="shell">
          <form className="mb-10 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
            <div className="relative">
              <Search
                size={17}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <Input
                name="q"
                defaultValue={q ?? ""}
                placeholder="Cari produk atau jasa…"
                className="pl-10"
              />
            </div>
            <Select name="category" defaultValue={category ?? ""}>
              <option value="">Semua kategori</option>
              {PRODUCT_CATEGORY.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
            <button
              type="submit"
              className="bg-maroon-bright rounded-lg px-6 py-2.5 text-sm font-bold text-white"
            >
              Cari
            </button>
          </form>

          {list.length === 0 ? (
            <EmptyState
              title="Belum ada produk yang cocok"
              desc={
                q || category
                  ? "Coba ubah kata kunci atau kategori."
                  : "Katalog akan terisi seiring anggota menambahkan produknya."
              }
            />
          ) : (
            <>
              <p className="mb-5 text-sm text-gray-500">
                Menampilkan {list.length} produk
              </p>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((p) => {
                  const business = Array.isArray(p.business) ? p.business[0] : p.business;
                  return (
                    <Card key={p.id} className="card-lift flex h-full flex-col overflow-hidden">
                      <div className="bg-maroon-deep pattern-geo grid h-32 place-items-center">
                        <Package size={34} className="text-white/25" />
                      </div>
                      <div className="flex flex-1 flex-col p-5">
                        <h2 className="font-display font-bold text-maroon-900">{p.name}</h2>
                        {p.description && (
                          <p className="mt-1.5 line-clamp-2 text-sm text-gray-600">
                            {p.description}
                          </p>
                        )}

                        <div className="mt-3 flex-1">
                          {p.category && <Badge tone="neutral">{p.category}</Badge>}
                        </div>

                        <div className="mt-4 border-t border-gray-100 pt-3">
                          <div className="font-semibold text-maroon-600">
                            {formatPrice(p.price, p.price_unit)}
                          </div>
                          {business && (
                            <Link
                              href={`/bisnis/${business.slug}`}
                              className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-gray-500 transition-colors hover:text-maroon-600"
                            >
                              <Building2 size={12} />
                              {business.name}
                              {business.city && ` · ${business.city}`}
                            </Link>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
}
