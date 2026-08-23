import { Link, data, redirect } from "react-router";
import { ArrowLeft, Package, Plus } from "lucide-react";
import type { Route } from "./+types/bisnis.$id";
import { requireUser } from "@/lib/auth.server";
import { businessSchema } from "@/lib/validations";
import { businessFormValues, clean } from "@/lib/member.server";
import { BusinessForm } from "@/components/member/business-form";
import { Card, ButtonLink, StatusBadge } from "@/components/ui";
import { formatPrice } from "@/lib/utils";

export const meta: Route.MetaFunction = ({ loaderData }) => [
  { title: loaderData ? `${loaderData.business.name} | KPMI` : "Ubah Usaha | KPMI" },
];

export async function loader({ request, params }: Route.LoaderArgs) {
  const { user, supabase, headers } = await requireUser(request);

  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", params.id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!business) {
    throw new Response("Usaha tidak ditemukan", { status: 404 });
  }

  const { data: products } = await supabase
    .from("products")
    .select("id, name, price, price_unit, is_published")
    .eq("business_id", params.id)
    .order("created_at", { ascending: false });

  return data(
    { business, products: products ?? [], userId: user.id },
    { headers },
  );
}

export async function action({ request, params }: Route.ActionArgs) {
  const { user, supabase, headers } = await requireUser(request);
  const formData = await request.formData();

  if (formData.get("intent") === "delete") {
    // Scoped to the owner as well as the id; RLS enforces it regardless.
    const { error } = await supabase
      .from("businesses")
      .delete()
      .eq("id", params.id)
      .eq("owner_id", user.id);

    if (error) return data({ error: "Gagal menghapus usaha." }, { status: 500, headers });
    return redirect("/dashboard/bisnis", { headers });
  }

  const parsed = businessSchema.safeParse(businessFormValues(formData));
  if (!parsed.success) {
    return data({ error: parsed.error.issues[0].message }, { status: 400, headers });
  }

  // Explicit ownership check for a clear message; RLS enforces it regardless.
  const { data: owned } = await supabase
    .from("businesses")
    .select("id")
    .eq("id", params.id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!owned) return data({ error: "Usaha tidak ditemukan." }, { status: 404, headers });

  const { error } = await supabase
    .from("businesses")
    .update(clean(parsed.data))
    .eq("id", params.id);

  if (error) return data({ error: "Gagal menyimpan perubahan." }, { status: 500, headers });

  return data({ ok: true as const }, { headers });
}

export default function EditBusinessPage({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const { business, products, userId } = loaderData;

  const error = actionData && "error" in actionData ? actionData.error : null;
  const saved = actionData && "ok" in actionData;

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/dashboard/bisnis"
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
              Produk &amp; Jasa ({products.length})
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

        {products.length === 0 ? (
          <p className="py-4 text-sm text-gray-500">
            Belum ada produk untuk usaha ini.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {products.map((p) => (
              <li key={p.id}>
                <Link
                  to={`/dashboard/produk/${p.id}`}
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

      <BusinessForm
        business={business}
        userId={userId}
        error={error}
        saved={saved}
      />
    </div>
  );
}
