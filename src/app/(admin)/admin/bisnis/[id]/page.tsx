import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Package, User } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireAdminContext } from "@/lib/auth";
import { Card, StatusBadge } from "@/components/ui";
import { StatusControl } from "../../status-control";
import { AdminBusinessForm } from "./admin-business-form";
import { formatPrice } from "@/lib/utils";

export const metadata = { title: "Ubah Usaha" };

/**
 * Admin editing of a member's business.
 *
 * The page loads the business without an owner filter — RLS already limits an
 * administrator to their own scope, so a row outside it simply is not returned
 * and the page 404s.
 */
export default async function AdminEditBusinessPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const ctx = await requireAdminContext();
  const supabase = await createClient();

  const { data: business } = await supabase
    .from("businesses")
    .select("*, owner:profiles(id, full_name, korwil)")
    .eq("id", id)
    .maybeSingle();

  if (!business) notFound();

  const owner = Array.isArray(business.owner) ? business.owner[0] : business.owner;

  // Defence in depth: RLS should already have excluded this row, but a korwil
  // admin must never land on a business outside their region.
  if (!ctx.isSuperAdmin && owner?.korwil !== ctx.managedKorwil) notFound();

  const { data: products } = await supabase
    .from("products")
    .select("id, name, price, price_unit, is_published")
    .eq("business_id", id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/bisnis"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-maroon-600"
        >
          <ArrowLeft size={15} /> Kembali ke daftar usaha
        </Link>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl font-extrabold text-maroon-900">
            {business.name}
          </h1>
          <StatusBadge status={business.status} />
          {business.status === "approved" && (
            <Link
              href={`/bisnis/${business.slug}`}
              target="_blank"
              className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-maroon-600"
            >
              <ExternalLink size={14} /> Lihat halaman publik
            </Link>
          )}
        </div>

        <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-sm text-gray-600">
          <User size={14} className="text-gray-400" />
          Milik <span className="font-semibold">{owner?.full_name ?? "—"}</span>
          {owner?.korwil && <span className="text-gray-500">· Korwil {owner.korwil}</span>}
        </p>
      </div>

      <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <div className="font-display font-bold text-maroon-900">Status Verifikasi</div>
          <p className="mt-0.5 text-sm text-gray-600">
            Usaha hanya tampil di direktori publik setelah disetujui.
          </p>
        </div>
        <StatusControl kind="business" id={business.id} status={business.status} />
      </Card>

      <Card className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <Package size={18} className="text-maroon-600" />
          <h2 className="font-display font-bold text-maroon-900">
            Produk &amp; Jasa ({products?.length ?? 0})
          </h2>
        </div>

        {!products || products.length === 0 ? (
          <p className="py-4 text-sm text-gray-500">Belum ada produk untuk usaha ini.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {products.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/admin/produk/${p.id}`}
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

      <div>
        <h2 className="font-display text-lg font-bold text-maroon-900">Ubah Data Usaha</h2>
        <p className="mt-1 text-sm text-gray-600">
          Perubahan yang Anda simpan langsung menggantikan data milik anggota.
        </p>
      </div>

      <AdminBusinessForm business={business} userId={ctx.userId} />
    </div>
  );
}
