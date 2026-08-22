"use client";

import { useMemo, useState, useTransition } from "react";
import { Search, ShieldCheck } from "lucide-react";
import { StatusBadge } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import type { ApprovalStatus, UserRole } from "@/types/database";
import { setMemberRole } from "../actions";
import { PasswordControl } from "../password-control";

export type AdminUserRow = {
  id: string;
  full_name: string;
  korwil: string | null;
  phone: string | null;
  role: UserRole;
  managed_korwil: string | null;
  status: ApprovalStatus;
  created_at: string;
};

/**
 * Administrator accounts, with the controls to change or revoke their access.
 *
 * Korwil options are passed in rather than imported from reference-data so the
 * dropdown reflects the live, editable korwil list.
 */
export function UserTable({
  users,
  isSuperAdmin,
  currentUserId,
  korwilOptions,
}: {
  users: AdminUserRow[];
  isSuperAdmin: boolean;
  currentUserId: string;
  korwilOptions: string[];
}) {
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("id");
    if (!term) return users;
    return users.filter((user) =>
      [user.full_name, user.korwil, user.managed_korwil, user.phone]
        .filter(Boolean)
        .some((value) => value!.toLocaleLowerCase("id").includes(term)),
    );
  }, [users, query]);

  return (
    <div className="space-y-4">
      <div className="relative w-full sm:max-w-md">
        <Search
          size={17}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Cari nama atau wilayah…"
          className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition-colors focus:border-maroon-600"
        />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-gray-50 text-left text-xs font-bold uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">Nama</th>
              <th className="px-4 py-3">Korwil asal</th>
              <th className="px-4 py-3">Peran &amp; cakupan</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Bergabung</th>
              {isSuperAdmin && <th className="px-4 py-3">Aksi</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {visible.length === 0 && (
              <tr>
                <td colSpan={isSuperAdmin ? 6 : 5} className="px-4 py-10 text-center text-gray-500">
                  Tidak ada pengguna yang cocok.
                </td>
              </tr>
            )}

            {visible.map((user) => (
              <tr key={user.id}>
                <td className="px-4 py-3">
                  <p className="font-semibold text-gray-900">
                    {user.full_name || "(tanpa nama)"}
                  </p>
                  {user.phone && <p className="text-xs text-gray-500">{user.phone}</p>}
                </td>
                <td className="px-4 py-3 text-gray-600">{user.korwil ?? "—"}</td>
                <td className="px-4 py-3">
                  {isSuperAdmin ? (
                    <AdminRoleControl
                      id={user.id}
                      role={user.role}
                      managedKorwil={user.managed_korwil}
                      isSelf={user.id === currentUserId}
                      korwilOptions={korwilOptions}
                    />
                  ) : (
                    <RoleLabel role={user.role} managedKorwil={user.managed_korwil} />
                  )}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={user.status} />
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                  {formatDate(user.created_at)}
                </td>
                {isSuperAdmin && (
                  <td className="px-4 py-3">
                    <PasswordControl
                      id={user.id}
                      userName={user.full_name || "administrator tanpa nama"}
                    />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RoleLabel({
  role,
  managedKorwil,
}: {
  role: UserRole;
  managedKorwil: string | null;
}) {
  if (role === "super_admin") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
        <ShieldCheck size={12} /> Super Admin
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-maroon-600">
      <ShieldCheck size={12} /> Admin Korwil {managedKorwil ?? "—"}
    </span>
  );
}

/**
 * Role assignment, including revoking admin rights entirely.
 *
 * Mirrors RoleControl on the members page but takes its korwil list as a prop.
 * Demoting an admin to "Anggota" is the revoke path, so it is confirmed first —
 * it is the one change here that removes someone's access.
 */
function AdminRoleControl({
  id,
  role,
  managedKorwil,
  isSelf,
  korwilOptions,
}: {
  id: string;
  role: UserRole;
  managedKorwil: string | null;
  isSelf: boolean;
  korwilOptions: string[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(false);

  function apply(nextRole: UserRole, region?: string | null) {
    setError(null);
    startTransition(async () => {
      const result = await setMemberRole(id, nextRole, region ?? null);
      if ("error" in result) setError(result.error);
      else {
        setPicking(false);
        setConfirmRevoke(false);
      }
    });
  }

  // A super admin cannot demote themselves; the action refuses it too.
  if (isSelf) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
        <ShieldCheck size={12} /> Super Admin (Anda)
      </span>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <select
          value={role}
          disabled={pending}
          onChange={(event) => {
            const next = event.target.value as UserRole;
            setError(null);
            if (next === "admin_korwil") {
              setConfirmRevoke(false);
              setPicking(true);
            } else if (next === "member") {
              setPicking(false);
              setConfirmRevoke(true);
            } else {
              apply(next);
            }
          }}
          className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-700 disabled:opacity-50"
        >
          <option value="member">Anggota (cabut akses)</option>
          <option value="admin_korwil">Admin Korwil</option>
          <option value="super_admin">Super Admin</option>
        </select>

        {role === "admin_korwil" && managedKorwil && !picking && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700">
            <ShieldCheck size={12} />
            {managedKorwil}
          </span>
        )}
      </div>

      {picking && (
        <div className="flex flex-wrap items-center gap-1.5">
          <select
            defaultValue={managedKorwil ?? ""}
            disabled={pending}
            onChange={(event) =>
              event.target.value && apply("admin_korwil", event.target.value)
            }
            className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 disabled:opacity-50"
          >
            <option value="">Pilih wilayah…</option>
            {korwilOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setPicking(false)}
            className="text-xs font-semibold text-gray-500 hover:text-gray-700"
          >
            Batal
          </button>
        </div>
      )}

      {confirmRevoke && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-gray-600">Cabut akses administrator?</span>
          <button
            type="button"
            onClick={() => apply("member")}
            disabled={pending}
            className="rounded-lg bg-red-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
          >
            Ya, cabut
          </button>
          <button
            type="button"
            onClick={() => setConfirmRevoke(false)}
            className="text-xs font-semibold text-gray-500 hover:text-gray-700"
          >
            Batal
          </button>
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
