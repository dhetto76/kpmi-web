import Link from "next/link";
import { Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, EmptyState } from "@/components/ui";
import { PublishToggle } from "../status-control";
import { requireAdminContext } from "@/lib/auth";
import { formatPrice, formatDate } from "@/lib/utils";

export default async function AdminProductsPage() {
  const ctx = await requireAdminContext();

  const supabase = await createClient();
  let query = supabase
    .from("products")
    .select(
      "id, name, price, price_unit, category, is_published, created_at, business:businesses!inner(name, owner:profiles!inner(korwil))",
    )
    .order("created_at", { ascending: false });

  if (!ctx.isSuperAdmin && ctx.managedKorwil) {
    query = query.eq("business.owner.korwil", ctx.managedKorwil);
  }

  const { data: products } = await query;
  const list = products ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-maroon-900">Produk</h1>
        <p className="mt-1 text-sm text-gray-600">
          Sembunyikan produk yang tidak sesuai. Produk hanya tampil publik jika
          usaha induknya sudah disetujui.
        </p>
      </div>

      {list.length === 0 ? (
        <EmptyState title="Belum ada produk" />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[42rem] text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="px-5 py-3 font-bold">Produk</th>
                <th className="px-5 py-3 font-bold">Usaha</th>
                <th className="px-5 py-3 font-bold">Harga</th>
                <th className="px-5 py-3 font-bold">Ditambahkan</th>
                <th className="px-5 py-3 font-bold">Tampil</th>
                <th className="px-5 py-3 font-bold">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {list.map((p) => {
                const business = Array.isArray(p.business) ? p.business[0] : p.business;
                return (
                  <tr key={p.id}>
                    <td className="px-5 py-3">
                      <Link
                        href={`/admin/produk/${p.id}`}
                        className="font-semibold text-gray-900 hover:text-maroon-600 hover:underline"
                      >
                        {p.name}
                      </Link>
                      {p.category && (
                        <div className="text-xs text-gray-500">{p.category}</div>
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-600">{business?.name ?? "—"}</td>
                    <td className="px-5 py-3 whitespace-nowrap text-gray-600">
                      {formatPrice(p.price, p.price_unit)}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap text-gray-600">
                      {formatDate(p.created_at)}
                    </td>
                    <td className="px-5 py-3">
                      <PublishToggle id={p.id} isPublished={p.is_published} />
                    </td>
                    <td className="px-5 py-3">
                      <Link
                        href={`/admin/produk/${p.id}`}
                        title="Ubah data produk"
                        className="inline-flex rounded-lg bg-gray-100 p-2 text-gray-600 transition-colors hover:bg-maroon-50 hover:text-maroon-600"
                      >
                        <Pencil size={15} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
