import { Link, data, redirect } from "react-router";
import { ArrowLeft } from "lucide-react";
import type { Route } from "./+types/produk.baru";
import { requireUser } from "@/lib/auth.server";
import { productSchema } from "@/lib/validations";
import { clean, ownsBusiness, productFormValues } from "@/lib/member.server";
import { slugify } from "@/lib/utils";
import { ProductForm } from "@/components/member/product-form";
import { EmptyState, ButtonLink } from "@/components/ui";

export const meta: Route.MetaFunction = () => [{ title: "Tambah Produk | KPMI" }];

export async function loader({ request }: Route.LoaderArgs) {
  const { user, supabase, headers } = await requireUser(request);

  const { data: businesses } = await supabase
    .from("businesses")
    .select("id, name")
    .eq("owner_id", user.id)
    .order("name");

  const defaultBusinessId =
    new URL(request.url).searchParams.get("business") ?? undefined;

  return data(
    { businesses: businesses ?? [], defaultBusinessId, userId: user.id },
    { headers },
  );
}

export async function action({ request }: Route.ActionArgs) {
  const { user, supabase, headers } = await requireUser(request);

  const formData = await request.formData();
  const businessId = String(formData.get("business_id") ?? "");

  // The picker is a form field now, so the business id is caller-supplied and
  // has to be re-checked — the Next.js version received it as a bound
  // argument from a page that had already verified ownership.
  if (!businessId || !(await ownsBusiness(supabase, businessId, user.id))) {
    return data({ error: "Usaha tidak ditemukan." }, { status: 404, headers });
  }

  const parsed = productSchema.safeParse(productFormValues(formData));
  if (!parsed.success) {
    return data({ error: parsed.error.issues[0].message }, { status: 400, headers });
  }

  const { error } = await supabase.from("products").insert({
    ...clean(parsed.data),
    slug: slugify(parsed.data.name),
    business_id: businessId,
  });

  if (error) {
    if (error.code === "23505") {
      return data(
        { error: "Produk dengan nama itu sudah ada pada usaha ini." },
        { status: 409, headers },
      );
    }
    return data({ error: "Gagal menyimpan produk." }, { status: 500, headers });
  }

  return redirect("/dashboard/produk", { headers });
}

export default function NewProductPage({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const { businesses, defaultBusinessId, userId } = loaderData;

  if (businesses.length === 0) {
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
          to="/dashboard/produk"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-maroon-600"
        >
          <ArrowLeft size={15} /> Kembali
        </Link>
        <h1 className="mt-3 font-display text-2xl font-extrabold text-maroon-900">
          Tambah Produk
        </h1>
      </div>

      <ProductForm
        businesses={businesses}
        defaultBusinessId={defaultBusinessId}
        userId={userId}
        error={actionData?.error}
      />
    </div>
  );
}
