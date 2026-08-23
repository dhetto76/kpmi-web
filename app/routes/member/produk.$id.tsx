import { Link, data, redirect } from "react-router";
import { ArrowLeft } from "lucide-react";
import type { Route } from "./+types/produk.$id";
import { requireUser } from "@/lib/auth.server";
import { productSchema } from "@/lib/validations";
import { clean, productFormValues } from "@/lib/member.server";
import { ProductForm } from "@/components/member/product-form";

export const meta: Route.MetaFunction = ({ loaderData }) => [
  { title: loaderData ? `${loaderData.product.name} | KPMI` : "Ubah Produk | KPMI" },
];

export async function loader({ request, params }: Route.LoaderArgs) {
  const { user, supabase, headers } = await requireUser(request);

  // RLS restricts this to products the caller owns.
  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (!product) {
    throw new Response("Produk tidak ditemukan", { status: 404 });
  }

  const { data: businesses } = await supabase
    .from("businesses")
    .select("id, name")
    .eq("owner_id", user.id)
    .order("name");

  return data(
    { product, businesses: businesses ?? [], userId: user.id },
    { headers },
  );
}

export async function action({ request, params }: Route.ActionArgs) {
  const { supabase, headers } = await requireUser(request);
  const formData = await request.formData();

  if (formData.get("intent") === "delete") {
    // RLS restricts the delete to products the caller owns.
    const { error } = await supabase.from("products").delete().eq("id", params.id);
    if (error) return data({ error: "Gagal menghapus produk." }, { status: 500, headers });
    return redirect("/dashboard/produk", { headers });
  }

  const parsed = productSchema.safeParse(productFormValues(formData));
  if (!parsed.success) {
    return data({ error: parsed.error.issues[0].message }, { status: 400, headers });
  }

  // RLS restricts this update to products the caller owns.
  const { error } = await supabase
    .from("products")
    .update(clean(parsed.data))
    .eq("id", params.id);

  if (error) return data({ error: "Gagal menyimpan perubahan." }, { status: 500, headers });

  return data({ ok: true as const }, { headers });
}

export default function EditProductPage({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const { product, businesses, userId } = loaderData;

  const error = actionData && "error" in actionData ? actionData.error : null;
  const saved = actionData && "ok" in actionData;

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/dashboard/produk"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-maroon-600"
        >
          <ArrowLeft size={15} /> Kembali
        </Link>
        <h1 className="mt-3 font-display text-2xl font-extrabold text-maroon-900">
          {product.name}
        </h1>
      </div>

      <ProductForm
        product={product}
        businesses={businesses}
        userId={userId}
        error={error}
        saved={saved}
      />
    </div>
  );
}
