import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Package, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { BusinessForm } from "../business-form";
import { Card, ButtonLink, StatusBadge } from "@/components/ui";
import { formatPrice } from "@/lib/utils";

export const metadata = { title: "Ubah Usaha" };

export default async function EditBusinessPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/masuk");

  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!business) notFound();

  const { data: products } = await supabase
    .from("products")
    .select("id, name, price, price_unit, is_published")
    .eq("business_id", id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/bisnis"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-maroon-600"
        >
          <ArrowLeft size={15} /> Kembali
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl font-extrabold text-maroon-900">
            {business.name}
          </h1>
          <StatusBadge status={business.status} />
        </div>
        {business.status === "pending" && (
          <p className="mt-1 text-sm text-gray-600">
            Usaha ini menunggu verifikasi pengurus sebelum tampil di direktori publik.
          </p>
        )}
      </div>

      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Package size={18} className="text-maroon-600" />
            <h2 className="font-display font-bold text-maroon-900">
              Produk &amp; Jasa ({products?.length ?? 0})
            </h2>
          </div>
          <ButtonLink
            href={`/dashboard/produk/baru?business=${business.id}`}
            size="sm"
            variant="outline"
          >
            <Plus size={15} /> Tambah
          </ButtonLink>
        </div>

        {!products || products.length === 0 ? (
          <p className="py-4 text-sm text-gray-500">
            Belum ada produk untuk usaha ini.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {products.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/dashboard/produk/${p.id}`}
                  className="flex items-center justify-between gap-4 py-3 transition-colors hover:bg-gray-50"
                >
                  <span className="min-w-0 truncate font-medium text-gray-900">
                    {p.name}
                  </span>
                  <span className="flex shrink-0 items-center gap-3 text-sm text-gray-600">
                    {formatPrice(p.price, p.price_unit)}
                    {!p.is_published && (
                      <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-600">
                        Draf
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <BusinessForm business={business} userId={user.id} />
    </div>
  );
}
