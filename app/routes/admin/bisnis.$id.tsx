import { Link, data, redirect } from "react-router";
import { ArrowLeft, ExternalLink, Package, User } from "lucide-react";
import type { Route } from "./+types/bisnis.$id";
import { requireAdminContext } from "@/lib/auth.server";
import { Card, StatusBadge } from "@/components/ui";
import { StatusControl } from "@/components/admin/status-control";
import { BusinessForm } from "@/components/member/business-form";
import { businessSchema } from "@/lib/validations";
import { businessFormValues } from "@/lib/member.server";
import {
  OUT_OF_SCOPE,
  UUID_RE,
  clean,
  isStatus,
  scopedBusiness,
  uniqueBusinessSlug,
} from "@/lib/admin.server";
import { formatPrice } from "@/lib/utils";

export const meta: Route.MetaFunction = ({ loaderData }) => [
  { title: loaderData ? `${loaderData.business.name} | Panel Admin` : "Ubah Usaha | Panel Admin" },
];

/**
 * Admin editing of a member's business.
 *
 * The loader reads the business without an owner filter — RLS already limits
 * an administrator to their own scope, so a row outside it simply is not
 * returned and the page 404s.
 */
export async function loader({ request, params }: Route.LoaderArgs) {
  const { context: ctx, supabase, headers } = await requireAdminContext(request);

  const { data: business } = await supabase
    .from("businesses")
    .select("*, owner:profiles(id, full_name, korwil)")
    .eq("id", params.id)
    .maybeSingle();

  if (!business) throw new Response("Usaha tidak ditemukan", { status: 404 });

  const owner = Array.isArray(business.owner) ? business.owner[0] : business.owner;

  // Defence in depth: RLS should already have excluded this row, but a korwil
  // admin must never land on a business outside their region.
  if (!ctx.isSuperAdmin && owner?.korwil !== ctx.managedKorwil) {
    throw new Response("Usaha tidak ditemukan", { status: 404 });
  }

  const { data: products } = await supabase
    .from("products")
    .select("id, name, price, price_unit, is_published")
    .eq("business_id", params.id)
    .order("created_at", { ascending: false });

  return data(
    { business, owner, products: products ?? [], userId: ctx.userId },
    { headers },
  );
}

export async function action({ request, params }: Route.ActionArgs) {
  const { context: ctx, supabase, headers } = await requireAdminContext(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  const fail = (error: string, status = 400) => data({ error }, { status, headers });

  /* Row status control posts here too. */
  if (intent === "set-business-status") {
    const id = String(formData.get("id") ?? "");
    const status = formData.get("status");
    if (!UUID_RE.test(id)) return fail("ID usaha tidak valid.");
    if (!isStatus(status)) return fail("Status tidak valid.");

    const { data: target } = await supabase
      .from("businesses")
      .select("owner_id, owner:profiles(korwil)")
      .eq("id", id)
      .maybeSingle();

    if (!target) return fail("Usaha tidak ditemukan.", 404);

    if (!ctx.isSuperAdmin) {
      const owner = Array.isArray(target.owner) ? target.owner[0] : target.owner;
      if (owner?.korwil !== ctx.managedKorwil) return fail(OUT_OF_SCOPE, 403);
      if (target.owner_id === ctx.userId) {
        return fail("Anda tidak dapat menyetujui usaha milik sendiri.", 403);
      }
    }

    const { error } = await supabase.from("businesses").update({ status }).eq("id", id);
    if (error) return fail("Gagal memperbarui status usaha.", 500);
    return data({ ok: true }, { headers });
  }

  const denied = await scopedBusiness(supabase, ctx, params.id);
  if (denied) return data(denied, { status: 403, headers });

  if (intent === "delete") {
    const { error } = await supabase.from("businesses").delete().eq("id", params.id);
    if (error) return fail("Gagal menghapus usaha.", 500);
    return redirect("/admin/bisnis", { headers });
  }

  const parsed = businessSchema.safeParse(businessFormValues(formData));
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  // The public URL carries the slug, so a renamed business needs a fresh one.
  const { data: current } = await supabase
    .from("businesses")
    .select("name, slug")
    .eq("id", params.id)
    .single();

  const values: Record<string, unknown> = clean(parsed.data);
  if (current && current.name !== parsed.data.name) {
    values.slug = await uniqueBusinessSlug(supabase, parsed.data.name, params.id);
  }

  const { error } = await supabase.from("businesses").update(values).eq("id", params.id);
  if (error) return fail("Gagal menyimpan perubahan.", 500);

  return data({ ok: true }, { headers });
}

export default function AdminEditBusinessPage({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const { business, owner, products, userId } = loaderData;

  const error = actionData && "error" in actionData ? actionData.error : null;
  const saved = actionData && "ok" in actionData;

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/admin/bisnis"
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
              to={`/bisnis/${business.slug}`}
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
            Produk &amp; Jasa ({products.length})
          </h2>
        </div>

        {products.length === 0 ? (
          <p className="py-4 text-sm text-gray-500">Belum ada produk untuk usaha ini.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {products.map((p) => (
              <li key={p.id}>
                <Link
                  to={`/admin/produk/${p.id}`}
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

      {/* The member form, posting to this admin route instead of its own. */}
      <BusinessForm business={business} userId={userId} error={error} saved={saved} />
    </div>
  );
}
