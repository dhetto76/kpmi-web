import { Link, data } from "react-router";
import { ExternalLink, Pencil } from "lucide-react";
import type { Route } from "./+types/bisnis._index";
import { requireAdminContext } from "@/lib/auth.server";
import { Card, StatusBadge, EmptyState } from "@/components/ui";
import { StatusControl } from "@/components/admin/status-control";
import { formatDate, cn } from "@/lib/utils";
import { OUT_OF_SCOPE, UUID_RE, isStatus } from "@/lib/admin.server";

export const meta: Route.MetaFunction = () => [{ title: "Usaha | Panel Admin" }];

const FILTERS = [
  { value: "", label: "Semua" },
  { value: "pending", label: "Menunggu" },
  { value: "approved", label: "Disetujui" },
  { value: "rejected", label: "Ditolak" },
];

export async function loader({ request }: Route.LoaderArgs) {
  const { context: ctx, supabase, headers } = await requireAdminContext(request);
  const status = new URL(request.url).searchParams.get("status") ?? "";

  // Scoped through the owner's korwil — businesses.city is free text and does
  // not reliably match a korwil name.
  let query = supabase
    .from("businesses")
    .select(
      "id, name, slug, city, industry, status, created_at, owner:profiles!inner(full_name, korwil)",
    )
    .order("created_at", { ascending: false });

  if (!ctx.isSuperAdmin && ctx.managedKorwil) {
    query = query.eq("owner.korwil", ctx.managedKorwil);
  }
  if (status) query = query.eq("status", status);

  const { data: businesses } = await query;

  return data({ businesses: businesses ?? [], status }, { headers });
}

/** Approve / reject from the row controls. */
export async function action({ request }: Route.ActionArgs) {
  const { context: ctx, supabase, headers } = await requireAdminContext(request);
  const formData = await request.formData();

  const id = String(formData.get("id") ?? "");
  const status = formData.get("status");
  if (!UUID_RE.test(id)) return data({ error: "ID usaha tidak valid." }, { status: 400, headers });
  if (!isStatus(status)) return data({ error: "Status tidak valid." }, { status: 400, headers });

  const { data: target } = await supabase
    .from("businesses")
    .select("owner_id, owner:profiles(korwil)")
    .eq("id", id)
    .maybeSingle();

  if (!target) return data({ error: "Usaha tidak ditemukan." }, { status: 404, headers });

  if (!ctx.isSuperAdmin) {
    const owner = Array.isArray(target.owner) ? target.owner[0] : target.owner;
    if (owner?.korwil !== ctx.managedKorwil) {
      return data({ error: OUT_OF_SCOPE }, { status: 403, headers });
    }
    // A korwil admin must not approve their own business.
    if (target.owner_id === ctx.userId) {
      return data(
        { error: "Anda tidak dapat menyetujui usaha milik sendiri." },
        { status: 403, headers },
      );
    }
  }

  const { error } = await supabase.from("businesses").update({ status }).eq("id", id);
  if (error) return data({ error: "Gagal memperbarui status usaha." }, { status: 500, headers });

  return data({ ok: true }, { headers });
}

export default function AdminBusinessesPage({ loaderData }: Route.ComponentProps) {
  const { businesses: list, status } = loaderData;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-maroon-900">Usaha</h1>
        <p className="mt-1 text-sm text-gray-600">
          Verifikasi usaha sebelum tampil di direktori publik.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            to={f.value ? `/admin/bisnis?status=${f.value}` : "/admin/bisnis"}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-semibold transition-colors",
              (status ?? "") === f.value
                ? "bg-maroon-600 text-white"
                : "bg-white text-gray-700 hover:bg-maroon-50",
            )}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {list.length === 0 ? (
        <EmptyState title="Tidak ada usaha pada filter ini" />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[46rem] text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="px-5 py-3 font-bold">Usaha</th>
                <th className="px-5 py-3 font-bold">Pemilik</th>
                <th className="px-5 py-3 font-bold">Industri</th>
                <th className="px-5 py-3 font-bold">Didaftarkan</th>
                <th className="px-5 py-3 font-bold">Status</th>
                <th className="px-5 py-3 font-bold">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {list.map((b) => {
                const owner = Array.isArray(b.owner) ? b.owner[0] : b.owner;
                return (
                  <tr key={b.id}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/admin/bisnis/${b.id}`}
                          className="font-semibold text-gray-900 hover:text-maroon-600 hover:underline"
                        >
                          {b.name}
                        </Link>
                        {b.status === "approved" && (
                          <Link
                            to={`/bisnis/${b.slug}`}
                            target="_blank"
                            className="text-gray-400 hover:text-maroon-600"
                            title="Lihat halaman publik"
                          >
                            <ExternalLink size={13} />
                          </Link>
                        )}
                      </div>
                      {b.city && <div className="text-xs text-gray-500">{b.city}</div>}
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {owner?.full_name ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-gray-600">{b.industry ?? "—"}</td>
                    <td className="px-5 py-3 whitespace-nowrap text-gray-600">
                      {formatDate(b.created_at)}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={b.status} />
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        <StatusControl kind="business" id={b.id} status={b.status} />
                        <Link
                          to={`/admin/bisnis/${b.id}`}
                          title="Ubah data usaha"
                          className="rounded-lg bg-gray-100 p-2 text-gray-600 transition-colors hover:bg-maroon-50 hover:text-maroon-600"
                        >
                          <Pencil size={15} />
                        </Link>
                      </div>
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
