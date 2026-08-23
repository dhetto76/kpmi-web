import { Link, data, redirect } from "react-router";
import { ArrowLeft, Building2, User } from "lucide-react";
import type { Route } from "./+types/produk.$id";
import { requireAdminContext } from "@/lib/auth.server";
import { ProductForm } from "@/components/member/product-form";
import { productSchema } from "@/lib/validations";
import { productFormValues } from "@/lib/member.server";
import { clean, scopedProduct } from "@/lib/admin.server";
import { slugify } from "@/lib/utils";

export const meta: Route.MetaFunction = ({ loaderData }) => [
  { title: loaderData ? `${loaderData.product.name} | Panel Admin` : "Ubah Produk | Panel Admin" },
];

export async function loader({ request, params }: Route.LoaderArgs) {
  const { context: ctx, supabase, headers } = await requireAdminContext(request);

  const { data: product } = await supabase
    .from("products")
    .select("*, business:businesses(id, name, owner:profiles(full_name, korwil))")
    .eq("id", params.id)
    .maybeSingle();

  if (!product) throw new Response("Produk tidak ditemukan", { status: 404 });

  const business = Array.isArray(product.business) ? product.business[0] : product.business;
  const owner = Array.isArray(business?.owner) ? business.owner[0] : business?.owner;

  // Defence in depth: RLS should already have excluded this row.
  if (!ctx.isSuperAdmin && owner?.korwil !== ctx.managedKorwil) {
    throw new Response("Produk tidak ditemukan", { status: 404 });
  }

  return data({ product, business, owner, userId: ctx.userId }, { headers });
}

export async function action({ request, params }: Route.ActionArgs) {
  const { context: ctx, supabase, headers } = await requireAdminContext(request);

  const denied = await scopedProduct(supabase, ctx, params.id);
  if (denied) return data(denied, { status: 403, headers });

  const formData = await request.formData();

  if (formData.get("intent") === "delete") {
    const { error } = await supabase.from("products").delete().eq("id", params.id);
    if (error) return data({ error: "Gagal menghapus produk." }, { status: 500, headers });
    return redirect("/admin/produk", { headers });
  }

  const parsed = productSchema.safeParse(productFormValues(formData));
  if (!parsed.success) {
    return data({ error: parsed.error.issues[0].message }, { status: 400, headers });
  }

  const { error } = await supabase
    .from("products")
    .update({ ...clean(parsed.data), slug: slugify(parsed.data.name) })
    .eq("id", params.id);

  if (error) {
    if (error.code === "23505") {
      return data(
        { error: "Produk dengan nama itu sudah ada pada usaha ini." },
        { status: 409, headers },
      );
    }
    return data({ error: "Gagal menyimpan perubahan." }, { status: 500, headers });
  }

  return data({ ok: true }, { headers });
}

export default function AdminEditProductPage({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const { product, business, owner, userId } = loaderData;

  const error = actionData && "error" in actionData ? actionData.error : null;
  const saved = actionData && "ok" in actionData;

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/admin/produk"
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
              to={`/admin/bisnis/${business.id}`}
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

      {/* The member form, posting to this admin route instead of its own. */}
      <ProductForm
        product={product}
        businesses={business ? [{ id: business.id, name: business.name }] : []}
        userId={userId}
        error={error}
        saved={saved}
      />
    </div>
  );
}
