import Link from "next/link";
import { ShieldCheck, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireAdminContext } from "@/lib/auth";
import { EmptyState } from "@/components/ui";
import { assignableKorwil } from "../settings-actions";
import { UserTable, type AdminUserRow } from "./user-table";

export const metadata = { title: "Pengguna" };

/**
 * Accounts with administrative rights.
 *
 * Deliberately separate from /admin/anggota: that page is the membership
 * queue, hundreds of rows deep, where the role column is incidental. This one
 * answers "who can administer this platform", which is the question worth
 * being able to audit at a glance.
 */
export default async function AdminUsersPage() {
  const ctx = await requireAdminContext();
  const supabase = await createClient();

  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, korwil, phone, role, managed_korwil, status, created_at")
    .in("role", ["super_admin", "admin_korwil"])
    .order("role")
    .order("full_name");

  const admins = (data ?? []) as AdminUserRow[];
  const korwilOptions = await assignableKorwil();

  const superAdmins = admins.filter((user) => user.role === "super_admin").length;
  const korwilAdmins = admins.length - superAdmins;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-maroon-900">Pengguna</h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-600">
          Akun yang memiliki akses administrator. Untuk mengangkat anggota menjadi
          admin, buka{" "}
          <Link href="/admin/anggota" className="font-semibold text-maroon-600 hover:underline">
            daftar anggota
          </Link>{" "}
          lalu ubah perannya.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <SummaryCard
          icon={<ShieldCheck size={20} />}
          label="Super Admin"
          value={superAdmins}
          hint="Akses penuh ke seluruh platform"
          tone="bg-amber-50 text-amber-600"
        />
        <SummaryCard
          icon={<Users size={20} />}
          label="Admin Korwil"
          value={korwilAdmins}
          hint="Akses terbatas pada wilayahnya"
          tone="bg-red-50 text-maroon-600"
        />
      </div>

      {admins.length === 0 ? (
        <EmptyState
          title="Belum ada administrator"
          desc="Ubah peran seorang anggota menjadi Admin Korwil atau Super Admin dari halaman anggota."
          action={
            <Link
              href="/admin/anggota"
              className="text-sm font-bold text-maroon-600 hover:underline"
            >
              Buka daftar anggota
            </Link>
          }
        />
      ) : (
        <UserTable
          users={admins}
          isSuperAdmin={ctx.isSuperAdmin}
          currentUserId={ctx.userId}
          korwilOptions={korwilOptions}
        />
      )}
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  hint: string;
  tone: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <span className={`grid size-11 shrink-0 place-items-center rounded-full ${tone}`}>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-2xl font-extrabold tabular-nums text-maroon-900">{value}</p>
        <p className="text-sm font-bold text-gray-800">{label}</p>
        <p className="truncate text-xs text-gray-500">{hint}</p>
      </div>
    </div>
  );
}
