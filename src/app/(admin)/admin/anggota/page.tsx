import Link from "next/link";
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

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;

  const supabase = await createClient();
  let query = supabase
    .from("profiles")
    .select("id, full_name, korwil, phone, status, role, created_at")
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);

  const { data: members } = await query;
  const list = members ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-maroon-900">Anggota</h1>
        <p className="mt-1 text-sm text-gray-600">
          Verifikasi keanggotaan. Profil tampil publik setelah disetujui.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={f.value ? `/admin/anggota?status=${f.value}` : "/admin/anggota"}
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
        <EmptyState title="Tidak ada anggota pada filter ini" />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[44rem] text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="px-5 py-3 font-bold">Nama</th>
                <th className="px-5 py-3 font-bold">Korwil</th>
                <th className="px-5 py-3 font-bold">Kontak</th>
                <th className="px-5 py-3 font-bold">Bergabung</th>
                <th className="px-5 py-3 font-bold">Status</th>
                <th className="px-5 py-3 font-bold">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {list.map((m) => (
                <tr key={m.id}>
                  <td className="px-5 py-3">
                    <div className="font-semibold text-gray-900">
                      {m.full_name || "(tanpa nama)"}
                    </div>
                    {m.role === "admin" && (
                      <span className="text-xs font-bold text-gold-600">Admin</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-gray-600">{m.korwil ?? "—"}</td>
                  <td className="px-5 py-3 text-gray-600">{m.phone ?? "—"}</td>
                  <td className="px-5 py-3 whitespace-nowrap text-gray-600">
                    {formatDate(m.created_at)}
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={m.status} />
                  </td>
                  <td className="px-5 py-3">
                    <StatusControl kind="member" id={m.id} status={m.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
