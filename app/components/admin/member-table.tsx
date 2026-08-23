import { useState } from "react";
import { Link, useFetcher, useSearchParams } from "react-router";
import { Check, ChevronLeft, ChevronRight, Search, Trash2, X } from "lucide-react";
import { Card, EmptyState, StatusBadge } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import type { ApprovalStatus, UserRole } from "@/types/database";
import { RoleControl } from "./role-control";
import { StatusControl } from "./status-control";
import { PasswordControl } from "./password-control";

export type MemberRow = {
  id: string;
  full_name: string;
  korwil: string | null;
  phone: string | null;
  status: ApprovalStatus;
  role: UserRole;
  managed_korwil: string | null;
  created_at: string;
};

function memberRoleLabel(role: UserRole, managedKorwil: string | null) {
  if (role === "super_admin") return "Super Admin";
  if (role === "admin_korwil") {
    return managedKorwil ? `Admin Korwil ${managedKorwil}` : "Admin Korwil";
  }
  return "Anggota";
}

export function MemberTable({
  members,
  isSuperAdmin,
  currentUserId,
  initialQuery,
  total,
  page,
  pageSize,
}: {
  members: MemberRow[];
  isSuperAdmin: boolean;
  currentUserId: string;
  initialQuery: string;
  total: number;
  page: number;
  pageSize: number;
}) {
  const [searchParams] = useSearchParams();
  const bulk = useFetcher<{ error?: string; message?: string }>();
  const pending = bulk.state !== "idle";

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);

  const error = bulk.data?.error ?? null;
  const message = bulk.data?.message ?? null;

  const visible = members;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  /** Same query string with one key replaced — keeps the active filters. */
  function withParam(key: string, value: string | null) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    const qs = next.toString();
    return qs ? `/admin/anggota?${qs}` : "/admin/anggota";
  }

  const selectableIds = visible
    .filter((member) => member.role === "member" && member.id !== currentUserId)
    .map((member) => member.id);
  const allVisibleSelected =
    selectableIds.length > 0 && selectableIds.every((id) => selected.has(id));

  function toggle(id: string) {
    setConfirming(false);
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllVisible() {
    setConfirming(false);
    setSelected((current) => {
      const next = new Set(current);
      if (allVisibleSelected) selectableIds.forEach((id) => next.delete(id));
      else selectableIds.forEach((id) => next.add(id));
      return next;
    });
  }

  /** Sends the selection as repeated `ids` fields, read back with getAll(). */
  function submitBulk(intent: "approve-members" | "delete-members") {
    const body = new FormData();
    body.set("intent", intent);
    for (const id of selected) body.append("ids", id);
    bulk.submit(body, { method: "post" });
    setSelected(new Set());
    setConfirming(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/*
          A GET form, not a debounced router.replace. Search now costs one
          submit instead of a request per keystroke, and the result is a
          shareable URL that also works without JavaScript.
        */}
        <bulk.Form method="get" action="/admin/anggota" className="relative w-full sm:max-w-md">
          {/* Preserve the other filters when searching. */}
          {["status", "role", "korwil"].map((key) =>
            searchParams.get(key) ? (
              <input key={key} type="hidden" name={key} value={searchParams.get(key)!} />
            ) : null,
          )}
          <Search
            size={17}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="search"
            name="q"
            defaultValue={initialQuery}
            placeholder="Cari nama, korwil, atau telepon…"
            aria-label="Cari anggota"
            className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-10 text-sm text-gray-900 outline-none transition-colors focus:border-maroon-600"
          />
          {initialQuery && (
            <Link
              to={withParam("q", null)}
              aria-label="Hapus pencarian"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            >
              <X size={15} />
            </Link>
          )}
        </bulk.Form>

        {selected.size > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-gray-700">{selected.size} dipilih</span>
            {confirming ? (
              <>
                <span className="text-sm text-gray-600">Hapus permanen?</span>
                <button
                  type="button"
                  onClick={() => submitBulk("delete-members")}
                  disabled={pending}
                  className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60"
                >
                  <Trash2 size={15} /> {pending ? "Menghapus…" : "Ya, hapus"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  disabled={pending}
                  className="rounded-full px-3 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100"
                >
                  Batal
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => submitBulk("approve-members")}
                  disabled={pending}
                  className="inline-flex items-center gap-1.5 rounded-full bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-60"
                >
                  <Check size={15} /> {pending ? "Memproses…" : "Setujui pilihan"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(true)}
                  disabled={pending}
                  className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-100 disabled:opacity-60"
                >
                  <Trash2 size={15} /> Hapus pilihan
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {(error || message) && (
        <p role="status" className={`text-sm font-medium ${error ? "text-red-600" : "text-green-700"}`}>
          {error ?? message}
        </p>
      )}

      {visible.length === 0 ? (
        <EmptyState
          title={initialQuery ? "Tidak ada anggota yang cocok" : "Tidak ada anggota pada filter ini"}
          desc={initialQuery ? "Coba gunakan nama, korwil, atau nomor telepon lain." : "Ubah pilihan filter atau reset untuk menampilkan semua anggota."}
        />
      ) : (
        <>
          <Card className="overflow-x-auto">
            <table className="w-full min-w-[48rem] text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="w-12 px-5 py-3">
                  <input type="checkbox" checked={allVisibleSelected} onChange={toggleAllVisible} disabled={selectableIds.length === 0 || pending} aria-label="Pilih semua anggota yang tampil" className="size-4 accent-maroon-600" />
                </th>
                <th className="px-5 py-3 font-bold">Nama</th>
                <th className="px-5 py-3 font-bold">Korwil</th>
                <th className="px-5 py-3 font-bold">Kontak</th>
                <th className="px-5 py-3 font-bold">Bergabung</th>
                <th className="px-5 py-3 font-bold">Status</th>
                {isSuperAdmin && <th className="px-5 py-3 font-bold">Peran</th>}
                <th className="px-5 py-3 font-bold">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visible.map((member) => {
                const selectable = member.role === "member" && member.id !== currentUserId;
                return (
                  <tr key={member.id} className={selected.has(member.id) ? "bg-red-50/50" : undefined}>
                    <td className="px-5 py-3">
                      <input type="checkbox" checked={selected.has(member.id)} onChange={() => toggle(member.id)} disabled={!selectable || pending} aria-label={`Pilih ${member.full_name || "anggota tanpa nama"}`} title={selectable ? "Pilih anggota" : "Akun administrator tidak dapat dihapus"} className="size-4 accent-maroon-600" />
                    </td>
                    <td className="px-5 py-3">
                      <div className="font-semibold text-gray-900">{member.full_name || "(tanpa nama)"}</div>
                      {member.role !== "member" && <span className="text-xs font-bold text-gold-600">{memberRoleLabel(member.role, member.managed_korwil)}</span>}
                    </td>
                    <td className="px-5 py-3 text-gray-600">{member.korwil ?? "—"}</td>
                    <td className="px-5 py-3 text-gray-600">{member.phone ?? "—"}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-gray-600">{formatDate(member.created_at)}</td>
                    <td className="px-5 py-3"><StatusBadge status={member.status} /></td>
                    {isSuperAdmin && (
                      <td className="px-5 py-3">
                        <RoleControl id={member.id} role={member.role} managedKorwil={member.managed_korwil} isSelf={member.id === currentUserId} />
                      </td>
                    )}
                    <td className="px-5 py-3">
                      <div className="flex items-start gap-2">
                        <StatusControl kind="member" id={member.id} status={member.status} />
                        {(isSuperAdmin || member.role === "member") && (
                          <PasswordControl
                            id={member.id}
                            userName={member.full_name || "anggota tanpa nama"}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            </table>
          </Card>
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600">
            <p>
              Menampilkan <span className="font-semibold text-gray-900">{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)}</span> dari <span className="font-semibold text-gray-900">{total}</span> anggota
            </p>
            <div className="flex items-center gap-2">
              <PageLink to={withParam("page", page > 2 ? String(page - 1) : null)} disabled={page <= 1}>
                <ChevronLeft size={15} /> Sebelumnya
              </PageLink>
              <span className="min-w-20 text-center text-xs font-semibold">{page} / {pageCount}</span>
              <PageLink to={withParam("page", String(page + 1))} disabled={page >= pageCount}>
                Berikutnya <ChevronRight size={15} />
              </PageLink>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/** Pagination control. A link, so the page is shareable and back works. */
function PageLink({
  to,
  disabled,
  children,
}: {
  to: string;
  disabled: boolean;
  children: React.ReactNode;
}) {
  const className =
    "inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-700";

  if (disabled) {
    return (
      <span aria-disabled className={`${className} cursor-not-allowed opacity-40`}>
        {children}
      </span>
    );
  }
  return (
    <Link to={to} className={`${className} hover:bg-gray-50`}>
      {children}
    </Link>
  );
}
