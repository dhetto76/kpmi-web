import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/ui";
import { requireAdminContext } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { MemberTable, type MemberRow } from "./member-table";

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
  const ctx = await requireAdminContext();
  const supabase = await createClient();

  // RLS already limits a korwil admin to their region; the explicit filter
  // also makes the scope clear and keeps the unfiltered result predictable.
  let query = supabase
    .from("profiles")
    .select("id, full_name, korwil, phone, status, role, managed_korwil, created_at")
    .order("created_at", { ascending: false });

  if (!ctx.isSuperAdmin && ctx.managedKorwil) {
    query = query.eq("korwil", ctx.managedKorwil);
  }
  if (status) query = query.eq("status", status);

  const { data: members } = await query;
  const list = members ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-maroon-900">Anggota</h1>
        <p className="mt-1 text-sm text-gray-600">
          Cari, verifikasi, dan kelola keanggotaan. Profil tampil publik setelah disetujui.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <Link
            key={filter.value}
            href={filter.value ? `/admin/anggota?status=${filter.value}` : "/admin/anggota"}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-semibold transition-colors",
              (status ?? "") === filter.value
                ? "bg-maroon-600 text-white"
                : "bg-white text-gray-700 hover:bg-maroon-50",
            )}
          >
            {filter.label}
          </Link>
        ))}
      </div>

      {list.length === 0 ? (
        <EmptyState title="Tidak ada anggota pada filter ini" />
      ) : (
        <MemberTable
          members={list as MemberRow[]}
          isSuperAdmin={ctx.isSuperAdmin}
          currentUserId={ctx.userId}
        />
      )}
    </div>
  );
}
