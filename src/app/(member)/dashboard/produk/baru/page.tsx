import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ProductForm } from "../product-form";
import { EmptyState, ButtonLink } from "@/components/ui";

export const metadata = { title: "Tambah Produk" };

export default async function NewProductPage({
  searchParams,
}: {
  searchParams: Promise<{ business?: string }>;
}) {
  const { business } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/masuk");

  const { data: businesses } = await supabase
    .from("businesses")
    .select("id, name")
    .eq("owner_id", user.id)
    .order("name");

  if (!businesses || businesses.length === 0) {
    return (
      <EmptyState
        title="Daftarkan usaha terlebih dahulu"
        desc="Produk selalu melekat pada sebuah usaha."
        action={<ButtonLink href="/dashboard/bisnis/baru">Daftarkan Usaha</ButtonLink>}
      />
    );
  }

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
          Tambah Produk
        </h1>
      </div>

      <ProductForm businesses={businesses} defaultBusinessId={business} userId={user.id} />
    </div>
  );
}
