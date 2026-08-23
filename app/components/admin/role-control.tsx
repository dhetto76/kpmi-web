import { useState } from "react";
import { useFetcher } from "react-router";
import { ShieldCheck } from "lucide-react";
import { KORWIL } from "@/lib/reference-data";
import type { UserRole } from "@/types/database";

/**
 * Role assignment for one member. Rendered only for super admins — the action
 * refuses anyone else regardless, this just avoids showing a dead control.
 */
export function RoleControl({
  id,
  role,
  managedKorwil,
  isSelf,
}: {
  id: string;
  role: UserRole;
  managedKorwil: string | null;
  isSelf: boolean;
}) {
  const fetcher = useFetcher<{ error?: string }>();
  const pending = fetcher.state !== "idle";
  const error = fetcher.data?.error;
  const [open, setOpen] = useState(false);

  // A super admin cannot demote themselves, so there is nothing to change.
  if (isSelf) {
    return <span className="text-xs font-bold text-gold-600">Super Admin (Anda)</span>;
  }

  function submit(nextRole: UserRole, region?: string) {
    fetcher.submit(
      {
        intent: "set-member-role",
        id,
        role: nextRole,
        managed_korwil: region ?? "",
      },
      { method: "post" },
    );
    if (nextRole !== "admin_korwil") setOpen(false);
  }

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <select
          value={role}
          disabled={pending}
          onChange={(e) => {
            const next = e.target.value as UserRole;
            // Picking Admin Korwil needs a region before it can be saved.
            if (next === "admin_korwil") setOpen(true);
            else submit(next);
          }}
          className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-700 disabled:opacity-50"
        >
          <option value="member">Anggota</option>
          <option value="admin_korwil">Admin Korwil</option>
          <option value="super_admin">Super Admin</option>
        </select>

        {role === "admin_korwil" && managedKorwil && !open && (
          <span className="inline-flex items-center gap-1 rounded-full bg-gold-50 px-2 py-0.5 text-xs font-bold text-gold-700">
            <ShieldCheck size={12} />
            {managedKorwil}
          </span>
        )}
      </div>

      {open && (
        <div className="flex flex-wrap items-center gap-1.5">
          <select
            defaultValue={managedKorwil ?? ""}
            disabled={pending}
            onChange={(e) => e.target.value && submit("admin_korwil", e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 disabled:opacity-50"
          >
            <option value="">Pilih wilayah…</option>
            {KORWIL.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setOpen(false)}
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
