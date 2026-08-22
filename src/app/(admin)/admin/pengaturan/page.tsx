import { requireAdminContext } from "@/lib/auth";
import { getSiteSettings } from "@/lib/settings";
import { SettingsForm } from "./settings-form";

export const metadata = { title: "Pengaturan Sistem" };

export default async function SystemSettingsPage() {
  const ctx = await requireAdminContext();
  const settings = await getSiteSettings();

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

      <SettingsForm settings={settings} canEdit={ctx.isSuperAdmin} />
    </div>
  );
}
