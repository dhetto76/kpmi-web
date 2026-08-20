"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, AlertCircle, Trash2 } from "lucide-react";
import { createBusiness, updateBusiness, deleteBusiness } from "../actions";
import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
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

export function BusinessForm({ business }: { business?: Business }) {
  const isEdit = !!business;
  const router = useRouter();
  const [message, setMessage] = useState<
    { type: "ok" | "error"; text: string } | null
  >(null);
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  function onSubmit(formData: FormData) {
    setMessage(null);
    startTransition(async () => {
      const result = isEdit
        ? await updateBusiness(business.id, formData)
        : await createBusiness(formData);

      // createBusiness redirects on success, so only errors return here.
      if (result && "error" in result) {
        setMessage({ type: "error", text: result.error });
      } else {
        setMessage({ type: "ok", text: "Perubahan berhasil disimpan." });
      }
    });
  }

  function onDelete() {
    startTransition(async () => {
      const result = await deleteBusiness(business!.id);
      if ("error" in result) {
        setMessage({ type: "error", text: result.error });
      } else {
        router.push("/dashboard/bisnis");
      }
    });
  }

  return (
    <form action={onSubmit} className="space-y-5">
      {message && (
        <div
          className={`flex items-start gap-2.5 rounded-lg p-3.5 text-sm ${
            message.type === "ok"
              ? "bg-green-50 text-green-800"
              : "bg-red-50 text-red-700"
          }`}
        >
          {message.type === "ok" ? (
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
          ) : (
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
          )}
          <span>{message.text}</span>
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
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={onDelete}
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
    </form>
  );
}
