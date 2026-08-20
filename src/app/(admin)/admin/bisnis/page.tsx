import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, StatusBadge, EmptyState } from "@/components/ui";
import { StatusControl } from "../status-control";
import { formatDate, cn } from "@/lib/utils";

const FILTERS = [
  { value: "", label: "Semua" },
  { value: "pending", label: "Menunggu" },
  { value: "approved", label: "Disetujui" },
  { value: "rejected", label: "Ditolak" },
];

export default async function AdminBusinessesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;

  const supabase = await createClient();
  let query = supabase
    .from("businesses")
    .select("id, name, slug, city, industry, status, created_at, owner:profiles(full_name)")
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);

  const { data: businesses } = await query;
  const list = businesses ?? [];

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
            href={f.value ? `/admin/bisnis?status=${f.value}` : "/admin/bisnis"}
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
                        <span className="font-semibold text-gray-900">{b.name}</span>
                        {b.status === "approved" && (
                          <Link
                            href={`/bisnis/${b.slug}`}
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
                      <StatusControl kind="business" id={b.id} status={b.status} />
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
