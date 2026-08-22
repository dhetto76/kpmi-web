"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, Search, Trash2, X } from "lucide-react";
import { Card, EmptyState, StatusBadge } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import type { ApprovalStatus, UserRole } from "@/types/database";
import { approveMembers, deleteMembers } from "../actions";
import { RoleControl } from "../role-control";
import { StatusControl } from "../status-control";

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

export function MemberTable({ members, isSuperAdmin, currentUserId }: {
  members: MemberRow[];
  isSuperAdmin: boolean;
  currentUserId: string;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const visible = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("id");
    if (!term) return members;
    return members.filter((member) =>
      [member.full_name, member.korwil, member.phone]
        .filter(Boolean)
        .some((value) => value!.toLocaleLowerCase("id").includes(term)),
    );
  }, [members, query]);

  const selectableIds = visible
    .filter((member) => member.role === "member" && member.id !== currentUserId)
    .map((member) => member.id);
  const allVisibleSelected = selectableIds.length > 0
    && selectableIds.every((id) => selected.has(id));

  function toggle(id: string) {
    setConfirming(false);
    setError(null);
    setMessage(null);
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllVisible() {
    setConfirming(false);
    setError(null);
    setMessage(null);
    setSelected((current) => {
      const next = new Set(current);
      if (allVisibleSelected) selectableIds.forEach((id) => next.delete(id));
      else selectableIds.forEach((id) => next.add(id));
      return next;
    });
  }

  function removeSelected() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await deleteMembers([...selected]);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setSelected(new Set());
      setConfirming(false);
      setMessage(`${result.deletedCount} anggota berhasil dihapus.`);
    });
  }

  function approveSelected() {
    setConfirming(false);
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await approveMembers([...selected]);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setSelected(new Set());
      setMessage(`${result.updatedCount} anggota berhasil disetujui.`);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari nama, korwil, atau telepon…"
            aria-label="Cari anggota"
            className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-10 text-sm text-gray-900 outline-none transition-colors focus:border-maroon-600"
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} aria-label="Hapus pencarian" className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
              <X size={15} />
            </button>
          )}
        </div>

        {selected.size > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-gray-700">{selected.size} dipilih</span>
            {confirming ? (
              <>
                <span className="text-sm text-gray-600">Hapus permanen?</span>
                <button type="button" onClick={removeSelected} disabled={pending} className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60">
                  <Trash2 size={15} /> {pending ? "Menghapus…" : "Ya, hapus"}
                </button>
                <button type="button" onClick={() => setConfirming(false)} disabled={pending} className="rounded-full px-3 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100">Batal</button>
              </>
            ) : (
              <>
                <button type="button" onClick={approveSelected} disabled={pending} className="inline-flex items-center gap-1.5 rounded-full bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-60">
                  <Check size={15} /> {pending ? "Memproses…" : "Setujui pilihan"}
                </button>
                <button type="button" onClick={() => setConfirming(true)} disabled={pending} className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-100 disabled:opacity-60">
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
        <EmptyState title="Tidak ada anggota yang cocok" desc="Coba gunakan nama, korwil, atau nomor telepon lain." />
      ) : (
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
                    <td className="px-5 py-3"><StatusControl kind="member" id={member.id} status={member.status} /></td>
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
