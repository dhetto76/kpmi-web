import { Form, data, useNavigation } from "react-router";
import { Building2, Save, UserPlus } from "lucide-react";
import type { Route } from "./+types/pengaturan";
import { requireAdminContext } from "@/lib/auth.server";
import { Field, Input, Textarea } from "@/components/ui";
import {
  getSiteSettings,
  SETTING_KEYS,
  type SettingKey,
} from "@/lib/settings.server";
import { SUPER_ADMIN_ONLY } from "@/lib/reference.server";

export const meta: Route.MetaFunction = () => [
  { title: "Pengaturan Sistem | Panel Admin" },
];

/** Settings stored as "true"/"false" and rendered as checkboxes. */
const BOOLEAN_KEYS: SettingKey[] = ["registration_open", "auto_approve_members"];

export async function loader({ request }: Route.LoaderArgs) {
  const { context: ctx, supabase, headers } = await requireAdminContext(request);
  const settings = await getSiteSettings(supabase);

  return data({ settings, canEdit: ctx.isSuperAdmin }, { headers });
}

export async function action({ request }: Route.ActionArgs) {
  const { context: ctx, supabase, headers } = await requireAdminContext(request);

  // Settings are global by definition, so this is never regional work.
  // RLS enforces the same rule underneath.
  if (!ctx.isSuperAdmin) {
    return data({ error: SUPER_ADMIN_ONLY }, { status: 403, headers });
  }

  const formData = await request.formData();

  const rows = SETTING_KEYS.map((key) => ({
    key,
    // An unchecked checkbox is absent from FormData, so read presence rather
    // than trusting a submitted value.
    value: BOOLEAN_KEYS.includes(key)
      ? String(formData.get(key) === "on")
      : String(formData.get(key) ?? "").trim().slice(0, 500),
    updated_by: ctx.userId,
  }));

  const email = rows.find((row) => row.key === "org_email")?.value ?? "";
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return data({ error: "Alamat email tidak valid." }, { status: 400, headers });
  }

  const { error } = await supabase.from("site_settings").upsert(rows, { onConflict: "key" });
  if (error) {
    return data({ error: "Gagal menyimpan pengaturan." }, { status: 500, headers });
  }

  // `revalidatePath("/", "layout")` in Next.js. The public layout re-reads
  // settings on its next request, so nothing further is needed here.
  return data({ ok: true }, { headers });
}

export default function SystemSettingsPage({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const { settings, canEdit } = loaderData;
  const pending = useNavigation().state === "submitting";

  const error = actionData && "error" in actionData ? actionData.error : null;
  const saved = actionData && "ok" in actionData;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-maroon-900">
          Pengaturan Sistem
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-600">
          Kontak organisasi dan perilaku pendaftaran. Perubahan langsung tampil di
          situs publik.
        </p>
      </div>

      <Form method="post" className="space-y-5">
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
      </Form>
    </div>
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
