import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, User } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireAdminContext } from "@/lib/auth";
import { AdminProductForm } from "./admin-product-form";

export const metadata = { title: "Ubah Produk" };

/**
 * Admin editing of a member's product.
 *
 * RLS limits an administrator to products owned within their scope, so a row
 * outside it is simply not returned and the page 404s.
 */
export default async function AdminEditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const ctx = await requireAdminContext();
  const supabase = await createClient();

  const { data: product } = await supabase
    .from("products")
    .select("*, business:businesses(id, name, owner:profiles(full_name, korwil))")
    .eq("id", id)
    .maybeSingle();

  if (!product) notFound();

  const business = Array.isArray(product.business)
    ? product.business[0]
    : product.business;
  const owner = Array.isArray(business?.owner) ? business.owner[0] : business?.owner;

  // Defence in depth, matching the business page.
  if (!ctx.isSuperAdmin && owner?.korwil !== ctx.managedKorwil) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/produk"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-maroon-600"
        >
          <ArrowLeft size={15} /> Kembali ke daftar produk
        </Link>

        <h1 className="mt-3 font-display text-2xl font-extrabold text-maroon-900">
          {product.name}
        </h1>

        <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-gray-600">
          <Building2 size={14} className="text-gray-400" />
          {business ? (
            <Link
              href={`/admin/bisnis/${business.id}`}
              className="font-semibold text-maroon-700 hover:underline"
            >
              {business.name}
            </Link>
          ) : (
            "—"
          )}
          {owner?.full_name && (
            <span className="inline-flex items-center gap-1.5 text-gray-500">
              <User size={14} className="text-gray-400" />
              {owner.full_name}
              {owner.korwil && <span>· Korwil {owner.korwil}</span>}
            </span>
          )}
        </p>
      </div>

      <AdminProductForm
        product={product}
        businesses={business ? [{ id: business.id, name: business.name }] : []}
        userId={ctx.userId}
      />
    </div>
  );
}
