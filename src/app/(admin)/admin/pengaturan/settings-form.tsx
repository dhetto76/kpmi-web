"use client";

import { useState, useTransition } from "react";
import { Building2, Save, UserPlus } from "lucide-react";
import { Field, Input, Textarea } from "@/components/ui";
import type { SettingKey } from "@/lib/settings";
import { updateSiteSettings } from "../settings-actions";

/**
 * Site settings form.
 *
 * Read-only for a korwil admin: these are platform-wide values, and the action
 * refuses a non-super-admin regardless. Disabled inputs are still rendered so
 * a regional admin can see the current contact details.
 */
export function SettingsForm({
  settings,
  canEdit,
}: {
  settings: Record<SettingKey, string>;
  canEdit: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function submit(formData: FormData) {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updateSiteSettings(formData);
      if ("error" in result) setError(result.error);
      else setSaved(true);
    });
  }

  return (
    <form action={submit} className="space-y-5">
      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </p>
      )}
      {saved && (
        <p className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          Pengaturan tersimpan.
        </p>
      )}

      <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-maroon-900">
          <Building2 size={16} /> Kontak organisasi
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email sekretariat">
            <Input
              type="email"
              name="org_email"
              defaultValue={settings.org_email}
              disabled={!canEdit}
              maxLength={200}
            />
          </Field>
          <Field label="Telepon">
            <Input
              name="org_phone"
              defaultValue={settings.org_phone}
              disabled={!canEdit}
              maxLength={50}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Alamat">
              <Input
                name="org_address"
                defaultValue={settings.org_address}
                disabled={!canEdit}
                maxLength={300}
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Tagline" hint="Tampil di beranda dan footer situs publik.">
              <Textarea
                name="org_tagline"
                defaultValue={settings.org_tagline}
                disabled={!canEdit}
                maxLength={300}
                className="min-h-20"
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field
              label="Pengumuman"
              hint="Kosongkan untuk menyembunyikan. Tampil sebagai banner di situs publik."
            >
              <Textarea
                name="announcement"
                defaultValue={settings.announcement}
                disabled={!canEdit}
                maxLength={500}
                className="min-h-20"
              />
            </Field>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-maroon-900">
          <UserPlus size={16} /> Pendaftaran anggota
        </h2>
        <div className="space-y-3">
          <Toggle
            name="registration_open"
            defaultChecked={settings.registration_open === "true"}
            disabled={!canEdit}
            label="Buka pendaftaran anggota baru"
            hint="Saat dimatikan, halaman /daftar menolak pendaftaran baru."
          />
          <Toggle
            name="auto_approve_members"
            defaultChecked={settings.auto_approve_members === "true"}
            disabled={!canEdit}
            label="Setujui anggota baru secara otomatis"
            hint="Biarkan mati agar setiap pendaftar diverifikasi admin terlebih dahulu."
          />
        </div>
      </section>

      {canEdit ? (
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-lg bg-maroon-600 px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-maroon-700 disabled:opacity-50"
        >
          <Save size={16} /> {pending ? "Menyimpan…" : "Simpan pengaturan"}
        </button>
      ) : (
        <p className="text-sm text-gray-500">
          Hanya Super Admin yang dapat mengubah pengaturan ini.
        </p>
      )}
    </form>
  );
}

function Toggle({
  name,
  label,
  hint,
  defaultChecked,
  disabled,
}: {
  name: string;
  label: string;
  hint: string;
  defaultChecked: boolean;
  disabled: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-100 p-3.5 transition-colors hover:bg-gray-50 has-[:disabled]:cursor-default has-[:disabled]:hover:bg-transparent">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        disabled={disabled}
        className="mt-0.5 size-4 shrink-0 accent-maroon-600"
      />
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-gray-800">{label}</span>
        <span className="block text-xs text-gray-500">{hint}</span>
      </span>
    </label>
  );
}
