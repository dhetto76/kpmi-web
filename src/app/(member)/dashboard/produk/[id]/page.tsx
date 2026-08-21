import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ProductForm } from "../product-form";

export const metadata = { title: "Ubah Produk" };

export default async function EditProductPage({
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

  // RLS restricts this to products the caller owns.
  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!product) notFound();

  const { data: businesses } = await supabase
    .from("businesses")
    .select("id, name")
    .eq("owner_id", user.id)
    .order("name");

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/produk"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-maroon-600"
        >
          <ArrowLeft size={15} /> Kembali
        </Link>
        <h1 className="mt-3 font-display text-2xl font-extrabold text-maroon-900">
          {product.name}
        </h1>
      </div>

      <ProductForm product={product} businesses={businesses ?? []} userId={user.id} />
    </div>
  );
}
