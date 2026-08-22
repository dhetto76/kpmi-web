import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { EmptyState, Select } from "@/components/ui";
import { requireAdminContext } from "@/lib/auth";
import { KORWIL } from "@/lib/reference-data";
import { MemberTable, type MemberRow } from "./member-table";

const STATUS_OPTIONS = [
  { value: "pending", label: "Menunggu" },
  { value: "approved", label: "Disetujui" },
  { value: "rejected", label: "Ditolak" },
] as const;

const ROLE_OPTIONS = [
  { value: "member", label: "Anggota" },
  { value: "admin_korwil", label: "Admin Korwil" },
  { value: "super_admin", label: "Super Admin" },
] as const;

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; korwil?: string; role?: string; q?: string; page?: string }>;
}) {
  const params = await searchParams;
  const ctx = await requireAdminContext();
  const supabase = await createClient();

  const status = STATUS_OPTIONS.some((option) => option.value === params.status)
    ? params.status
    : undefined;
  const role = ROLE_OPTIONS.some((option) => option.value === params.role)
    ? params.role
    : undefined;
  const korwil = ctx.isSuperAdmin && KORWIL.some((option) => option === params.korwil)
    ? params.korwil
    : undefined;
  const search = params.q?.trim().slice(0, 100) ?? "";
  const requestedPage = Number.parseInt(params.page ?? "1", 10);
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const pageSize = 50;

  // RLS already limits a korwil admin to their region; the explicit filter
  // also makes the scope clear and keeps the unfiltered result predictable.
  let query = supabase
    .from("profiles")
    .select("id, full_name, korwil, phone, status, role, managed_korwil, created_at", { count: "exact" })
    .order("created_at", { ascending: false });

  if (!ctx.isSuperAdmin && ctx.managedKorwil) {
    query = query.eq("korwil", ctx.managedKorwil);
  } else if (korwil) {
    query = query.eq("korwil", korwil);
  }
  if (status) query = query.eq("status", status);
  if (role) query = query.eq("role", role);
  if (search) {
    // PostgREST's `or` expression is parsed as a mini-language. Quoting and
    // escaping the user value keeps punctuation in names from changing it.
    const escaped = search.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    const pattern = `"%${escaped}%"`;
    query = query.or(`full_name.ilike.${pattern},korwil.ilike.${pattern},phone.ilike.${pattern}`);
  }

  query = query.range((page - 1) * pageSize, page * pageSize - 1);

  const { data: members, count, error } = await query;
  const list = members ?? [];
  const total = count ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-maroon-900">Anggota</h1>
        <p className="mt-1 text-sm text-gray-600">
          Cari, verifikasi, dan kelola keanggotaan. Profil tampil publik setelah disetujui.
        </p>
      </div>

      <form className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-sm font-bold text-maroon-900">
          <SlidersHorizontal size={16} /> Filter anggota
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto_auto] lg:items-end">
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-500">Korwil</span>
            <Select
              name="korwil"
              defaultValue={ctx.isSuperAdmin ? (korwil ?? "") : (ctx.managedKorwil ?? "")}
              disabled={!ctx.isSuperAdmin}
            >
              <option value="">Semua korwil</option>
              {KORWIL.map((option) => <option key={option} value={option}>{option}</option>)}
            </Select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-500">Status</span>
            <Select name="status" defaultValue={status ?? ""}>
              <option value="">Semua status</option>
              {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </Select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-500">Peran</span>
            <Select name="role" defaultValue={role ?? ""}>
              <option value="">Semua peran</option>
              {ROLE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </Select>
          </label>

          <button type="submit" className="rounded-lg bg-maroon-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-maroon-700">
            Terapkan
          </button>
          <Link href="/admin/anggota" className="rounded-lg px-4 py-2.5 text-center text-sm font-bold text-gray-600 transition-colors hover:bg-gray-100">
            Reset
          </Link>
        </div>
      </form>

      {error ? (
        <EmptyState
          title="Data anggota gagal dimuat"
          desc={error.message}
          action={<Link href="/admin/anggota" className="text-sm font-bold text-maroon-600 hover:underline">Reset filter</Link>}
        />
      ) : (
        <MemberTable
          key={`${search}-${status ?? ""}-${role ?? ""}-${korwil ?? ""}-${page}`}
          members={list as MemberRow[]}
          isSuperAdmin={ctx.isSuperAdmin}
          currentUserId={ctx.userId}
          initialQuery={search}
          total={total}
          page={page}
          pageSize={pageSize}
        />
      )}
    </div>
  );
}
