import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, ButtonLink, EmptyState, Badge } from "@/components/ui";
import { formatPrice } from "@/lib/utils";
import { ProductIcon } from "@/lib/category-icons";

export const metadata = { title: "Produk & Jasa" };

export default async function ProductListPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/masuk");

  // RLS limits this to products of businesses the caller owns.
  const { data: products } = await supabase
    .from("products")
    .select("id, name, price, price_unit, category, is_published, business:businesses(id, name)")
    .order("created_at", { ascending: false });

  const { count: businessCount } = await supabase
    .from("businesses")
    .select("*", { count: "exact", head: true })
    .eq("owner_id", user.id);

  const list = products ?? [];

  if (!businessCount) {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-extrabold text-maroon-900">
          Produk &amp; Jasa
        </h1>
        <EmptyState
          title="Daftarkan usaha terlebih dahulu"
          desc="Produk selalu melekat pada sebuah usaha. Daftarkan usaha Anda dulu, lalu tambahkan produknya."
          action={
            <ButtonLink href="/dashboard/bisnis/baru">
              <Plus size={16} /> Daftarkan Usaha
            </ButtonLink>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-maroon-900">
            Produk &amp; Jasa
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Kelola produk dan layanan dari seluruh usaha Anda.
          </p>
        </div>
        <ButtonLink href="/dashboard/produk/baru">
          <Plus size={16} /> Tambah Produk
        </ButtonLink>
      </div>

      {list.length === 0 ? (
        <EmptyState
          title="Belum ada produk"
          desc="Tambahkan produk atau jasa agar tampil di katalog KPMI."
          action={
            <ButtonLink href="/dashboard/produk/baru">
              <Plus size={16} /> Tambah Produk
            </ButtonLink>
          }
        />
      ) : (
        <Card className="divide-y divide-gray-100">
          {list.map((p) => {
            const business = Array.isArray(p.business) ? p.business[0] : p.business;
            return (
              <Link
                key={p.id}
                href={`/dashboard/produk/${p.id}`}
                className="flex items-center gap-4 p-4 transition-colors hover:bg-gray-50"
              >
                <div className="bg-maroon-deep grid h-11 w-11 shrink-0 place-items-center rounded-xl text-gold-300">
                  <ProductIcon category={p.category} size={19} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-gray-900">{p.name}</div>
                  <div className="mt-0.5 truncate text-xs text-gray-500">
                    {[business?.name, p.category].filter(Boolean).join(" · ")}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="hidden text-sm font-medium text-gray-700 sm:block">
                    {formatPrice(p.price, p.price_unit)}
                  </span>
                  {p.is_published ? (
                    <Badge tone="green">Publik</Badge>
                  ) : (
                    <Badge tone="neutral">Draf</Badge>
                  )}
                </div>
              </Link>
            );
          })}
        </Card>
      )}
    </div>
  );
}
