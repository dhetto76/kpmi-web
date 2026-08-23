import { Form, useNavigation } from "react-router";
import { useState } from "react";
import { CheckCircle2, AlertCircle, Trash2 } from "lucide-react";
import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import { ImageUpload } from "@/components/ui/image-upload";
import {
  JENIS_BADAN_USAHA, JENIS_USAHA, PRODUCT_CATEGORY, ROLE_USAHA,
  OMSET_PER_TAHUN, JUMLAH_KARYAWAN, STATUS_KANTOR, PASAR, PABRIK,
  LAPORAN_TERPISAH, MEMBUAT_LAPORAN_KEUANGAN, KARYAWAN_KEUANGAN, TIM_PENGELOLA,
} from "@/lib/reference-data";
import type { Business } from "@/types/database";


/** A titled group of related fields. */
function Section({
  title,
  desc,
  children,
}: {
  title: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-6">
      <h2 className="font-display text-lg font-bold text-maroon-900">{title}</h2>
      {desc && <p className="mt-1 text-sm text-gray-600">{desc}</p>}
      <div className="gold-rule mt-4 w-14" />
      <div className="mt-5 grid gap-5 sm:grid-cols-2">{children}</div>
    </Card>
  );
}

function OptionSelect({
  name,
  label,
  options,
  defaultValue,
  hint,
}: {
  name: string;
  label: string;
  options: readonly string[];
  defaultValue?: string | null;
  hint?: string;
}) {
  return (
    <Field label={label} hint={hint}>
      <Select name={name} defaultValue={defaultValue ?? ""}>
        <option value="">— Pilih —</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </Select>
    </Field>
  );
}

/**
 * The business form, shared by the member dashboard and the admin panel.
 *
 * Admins edit the same fields members do, so the form is identical — only the
 * route it posts to differs. Passing `action` in keeps one form to maintain
 * instead of two that drift apart.
 *
 * Next.js passed server actions in as props. Route actions are addressed by
 * URL rather than imported, so the caller passes a path; `undefined` posts to
 * the current route, which is what both the new and edit pages want.
 */
export function BusinessForm({
  business,
  userId,
  action,
  error,
  saved,
}: {
  business?: Business;
  /**
   * Whose folder uploaded images land in. Storage policies require the first
   * path segment to be the *uploader's* id, so an admin passes their own —
   * the files are publicly readable either way.
   */
  userId: string;
  /** Where to post. Defaults to the current route. */
  action?: string;
  error?: string | null;
  saved?: boolean;
}) {
  const isEdit = !!business;
  const navigation = useNavigation();
  const pending = navigation.state === "submitting";
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <Form method="post" action={action} className="space-y-5">
      {(error || saved) && (
        <div
          className={`flex items-start gap-2.5 rounded-lg p-3.5 text-sm ${
            saved ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"
          }`}
        >
          {saved ? (
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
          ) : (
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
          )}
          <span>{saved ? "Perubahan berhasil disimpan." : error}</span>
        </div>
      )}
      <Section title="Identitas Usaha" desc="Informasi dasar yang tampil di direktori.">
        <div className="sm:col-span-2">
          <Field label="Nama Usaha" required>
            <Input name="name" defaultValue={business?.name ?? ""} required />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Deskripsi Usaha">
            <Textarea
              name="description"
              defaultValue={business?.description ?? ""}
              placeholder="Jelaskan singkat bidang usaha dan keunggulan Anda."
            />
          </Field>
        </div>
        <div className="sm:col-span-2 grid gap-5 sm:grid-cols-[11rem_1fr]">
          <Field label="Logo Usaha">
            <ImageUpload
              name="logo_url"
              bucket="businesses"
              userId={userId}
              defaultValue={business?.logo_url}
              label="Unggah logo"
            />
          </Field>
          <Field label="Gambar Sampul">
            <ImageUpload
              name="cover_url"
              bucket="businesses"
              userId={userId}
              defaultValue={business?.cover_url}
              label="Unggah sampul"
              aspect="wide"
            />
          </Field>
        </div>

        <OptionSelect
          name="legal_form"
          label="Jenis Badan Usaha"
          options={JENIS_BADAN_USAHA}
          defaultValue={business?.legal_form}
        />
        <Field label="Tahun Berdiri">
          <Input
            name="founded_year"
            type="number"
            min={1900}
            max={new Date().getFullYear()}
            defaultValue={business?.founded_year ?? ""}
            placeholder="2015"
          />
        </Field>
        <Field label="NPWP Perusahaan">
          <Input name="npwp" defaultValue={business?.npwp ?? ""} />
        </Field>
        <Field label="SIUP / NIB">
          <Input name="siup" defaultValue={business?.siup ?? ""} />
        </Field>
      </Section>

      <Section title="Kontak & Alamat" desc="Cara calon mitra menghubungi Anda.">
        <div className="sm:col-span-2">
          <Field label="Alamat Perusahaan">
            <Textarea name="address" defaultValue={business?.address ?? ""} />
          </Field>
        </div>
        <Field label="Kota">
          <Input name="city" defaultValue={business?.city ?? ""} />
        </Field>
        <Field label="Telepon">
          <Input name="phone" defaultValue={business?.phone ?? ""} />
        </Field>
        <Field label="WhatsApp">
          <Input name="whatsapp" defaultValue={business?.whatsapp ?? ""} />
        </Field>
        <Field label="Email Usaha">
          <Input name="email" type="email" defaultValue={business?.email ?? ""} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Website" hint="Sertakan https://">
            <Input
              name="website"
              type="url"
              defaultValue={business?.website ?? ""}
              placeholder="https://contoh.com"
            />
          </Field>
        </div>
      </Section>

      <Section title="Klasifikasi" desc="Membantu anggota lain menemukan usaha Anda.">
        <OptionSelect
          name="industry"
          label="Kategori Industri"
          options={JENIS_USAHA}
          defaultValue={business?.industry}
        />
        <OptionSelect
          name="product_category"
          label="Kategori Produk"
          options={PRODUCT_CATEGORY}
          defaultValue={business?.product_category}
        />
        <OptionSelect
          name="business_role"
          label="Peran Usaha"
          options={ROLE_USAHA}
          defaultValue={business?.business_role}
        />
        <OptionSelect
          name="market"
          label="Pasar"
          options={PASAR}
          defaultValue={business?.market}
        />
      </Section>

      <Section
        title="Skala Usaha"
        desc="Opsional — membantu pengurus menyusun program yang sesuai."
      >
        <OptionSelect
          name="annual_revenue"
          label="Omzet per Tahun"
          options={OMSET_PER_TAHUN}
          defaultValue={business?.annual_revenue}
        />
        <OptionSelect
          name="employee_count"
          label="Jumlah Karyawan"
          options={JUMLAH_KARYAWAN}
          defaultValue={business?.employee_count}
        />
        <OptionSelect
          name="office_status"
          label="Status Kantor"
          options={STATUS_KANTOR}
          defaultValue={business?.office_status}
        />
        <OptionSelect
          name="production_method"
          label="Cara Produksi"
          options={PABRIK}
          defaultValue={business?.production_method}
        />
        <Field label="Jumlah Cabang">
          <Input
            name="branch_count"
            type="number"
            min={0}
            defaultValue={business?.branch_count ?? ""}
          />
        </Field>
        <div className="flex flex-col justify-end gap-3 pb-1">
          <label className="flex items-center gap-2.5 text-sm text-gray-700">
            <input
              type="checkbox"
              name="has_branches"
              defaultChecked={business?.has_branches ?? false}
              className="h-4 w-4 rounded border-gray-300 accent-maroon-600"
            />
            Memiliki cabang
          </label>
          <label className="flex items-center gap-2.5 text-sm text-gray-700">
            <input
              type="checkbox"
              name="has_marketing_team"
              defaultChecked={business?.has_marketing_team ?? false}
              className="h-4 w-4 rounded border-gray-300 accent-maroon-600"
            />
            Memiliki tim marketing
          </label>
        </div>
      </Section>

      <Section title="Tata Kelola" desc="Opsional — untuk pemetaan kebutuhan pendampingan.">
        <OptionSelect
          name="separate_finances"
          label="Laporan Keuangan Terpisah dari Pribadi?"
          options={LAPORAN_TERPISAH}
          defaultValue={business?.separate_finances}
        />
        <OptionSelect
          name="bookkeeping_method"
          label="Cara Membuat Laporan Keuangan"
          options={MEMBUAT_LAPORAN_KEUANGAN}
          defaultValue={business?.bookkeeping_method}
        />
        <OptionSelect
          name="has_finance_staff"
          label="Karyawan Keuangan"
          options={KARYAWAN_KEUANGAN}
          defaultValue={business?.has_finance_staff}
        />
        <OptionSelect
          name="has_management_team"
          label="Tim Pengelola Usaha"
          options={TIM_PENGELOLA}
          defaultValue={business?.has_management_team}
        />
      </Section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        {isEdit ? (
          confirmDelete ? (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-700">Hapus usaha ini?</span>
              {/*
                Submits the same form with intent=delete, which the route
                action branches on. A separate <Form> cannot be nested inside
                this one, and `formNoValidate` is needed so the browser does
                not block the delete on an empty required field.
              */}
              <Button
                type="submit"
                name="intent"
                value="delete"
                formNoValidate
                variant="danger"
                size="sm"
                disabled={pending}
              >
                Ya, hapus
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setConfirmDelete(false)}
              >
                Batal
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setConfirmDelete(true)}
              className="text-red-600 hover:bg-red-50"
            >
              <Trash2 size={15} /> Hapus usaha
            </Button>
          )
        ) : (
          <span />
        )}

        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Menyimpan…" : isEdit ? "Simpan Perubahan" : "Daftarkan Usaha"}
        </Button>
      </div>
    </Form>
  );
}
