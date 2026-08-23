import { Link, data } from "react-router";
import { Pencil } from "lucide-react";
import type { Route } from "./+types/produk._index";
import { requireAdminContext } from "@/lib/auth.server";
import { Card, EmptyState } from "@/components/ui";
import { PublishToggle } from "@/components/admin/status-control";
import { formatPrice, formatDate } from "@/lib/utils";
import { OUT_OF_SCOPE, UUID_RE } from "@/lib/admin.server";

export const meta: Route.MetaFunction = () => [{ title: "Produk | Panel Admin" }];

export async function loader({ request }: Route.LoaderArgs) {
  const { context: ctx, supabase, headers } = await requireAdminContext(request);

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

  return data({ products: products ?? [] }, { headers });
}

/** The publish toggle in each row posts here. */
export async function action({ request }: Route.ActionArgs) {
  const { context: ctx, supabase, headers } = await requireAdminContext(request);
  const formData = await request.formData();

  const id = String(formData.get("id") ?? "");
  if (!UUID_RE.test(id)) {
    return data({ error: "ID produk tidak valid." }, { status: 400, headers });
  }
  const isPublished = formData.get("is_published") === "true";

  if (!ctx.isSuperAdmin) {
    const { data: target } = await supabase
      .from("products")
      .select("business:businesses(owner:profiles(korwil))")
      .eq("id", id)
      .maybeSingle();

    const business = Array.isArray(target?.business) ? target.business[0] : target?.business;
    const owner = Array.isArray(business?.owner) ? business.owner[0] : business?.owner;
    if (!target || owner?.korwil !== ctx.managedKorwil) {
      return data({ error: OUT_OF_SCOPE }, { status: 403, headers });
    }
  }

  const { error } = await supabase
    .from("products")
    .update({ is_published: isPublished })
    .eq("id", id);

  if (error) return data({ error: "Gagal memperbarui produk." }, { status: 500, headers });
  return data({ ok: true }, { headers });
}

export default function AdminProductsPage({ loaderData }: Route.ComponentProps) {
  const list = loaderData.products;

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
                        to={`/admin/produk/${p.id}`}
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
                        to={`/admin/produk/${p.id}`}
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
