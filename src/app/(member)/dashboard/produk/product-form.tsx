"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, AlertCircle, Trash2 } from "lucide-react";
import { createProduct, updateProduct, deleteProduct } from "../actions";
import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import { MultiImageUpload } from "@/components/ui/image-upload";
import { PRODUCT_CATEGORY } from "@/lib/reference-data";
import type { Product, Business } from "@/types/database";

export function ProductForm({
  product,
  businesses,
  defaultBusinessId,
  userId,
}: {
  product?: Product;
  businesses: Pick<Business, "id" | "name">[];
  defaultBusinessId?: string;
  userId: string;
}) {
  const isEdit = !!product;
  const router = useRouter();
  const [businessId, setBusinessId] = useState(
    product?.business_id ?? defaultBusinessId ?? businesses[0]?.id ?? "",
  );
  const [message, setMessage] = useState<
    { type: "ok" | "error"; text: string } | null
  >(null);
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  function onSubmit(formData: FormData) {
    setMessage(null);
    startTransition(async () => {
      const result = isEdit
        ? await updateProduct(product.id, formData)
        : await createProduct(businessId, formData);

      if (result && "error" in result) {
        setMessage({ type: "error", text: result.error });
      } else {
        setMessage({ type: "ok", text: "Perubahan berhasil disimpan." });
      }
    });
  }

  function onDelete() {
    startTransition(async () => {
      const result = await deleteProduct(product!.id);
      if ("error" in result) {
        setMessage({ type: "error", text: result.error });
      } else {
        router.push("/dashboard/produk");
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

      <Card className="p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          {!isEdit && (
            <div className="sm:col-span-2">
              <Field label="Usaha" required hint="Produk ini milik usaha yang mana?">
                <Select
                  value={businessId}
                  onChange={(e) => setBusinessId(e.target.value)}
                  required
                >
                  {businesses.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          )}

          <div className="sm:col-span-2">
            <Field label="Nama Produk / Jasa" required>
              <Input name="name" defaultValue={product?.name ?? ""} required />
            </Field>
          </div>

          <div className="sm:col-span-2">
            <Field label="Deskripsi">
              <Textarea
                name="description"
                defaultValue={product?.description ?? ""}
                placeholder="Jelaskan produk, bahan, keunggulan, atau cakupan layanan."
              />
            </Field>
          </div>

          <Field label="Harga" hint="Kosongkan jika harga per penawaran">
            <Input
              name="price"
              type="number"
              min={0}
              step="0.01"
              defaultValue={product?.price ?? ""}
              placeholder="25000"
            />
          </Field>

          <Field label="Satuan" hint="Contoh: per kg, per proyek">
            <Input
              name="price_unit"
              defaultValue={product?.price_unit ?? ""}
              placeholder="per kg"
            />
          </Field>

          <div className="sm:col-span-2">
            <Field label="Kategori">
              <Select name="category" defaultValue={product?.category ?? ""}>
                <option value="">— Pilih kategori —</option>
                {PRODUCT_CATEGORY.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="sm:col-span-2">
            <Field label="Gambar Produk">
              <MultiImageUpload
                name="images"
                bucket="products"
                userId={userId}
                defaultValue={product?.images ?? []}
              />
            </Field>
          </div>

          <div className="sm:col-span-2 rounded-lg bg-gray-50 p-4">
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                name="is_published"
                defaultChecked={product?.is_published ?? false}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-maroon-600"
              />
              <span>
                <span className="font-semibold text-gray-900">Tampilkan ke publik</span>
                <span className="mt-0.5 block text-xs text-gray-600">
                  Produk hanya tampil di katalog jika usaha induknya sudah disetujui.
                </span>
              </span>
            </label>
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        {isEdit ? (
          confirmDelete ? (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-700">Hapus produk ini?</span>
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
              <Trash2 size={15} /> Hapus produk
            </Button>
          )
        ) : (
          <span />
        )}

        <Button type="submit" size="lg" disabled={pending || !businessId}>
          {pending ? "Menyimpan…" : isEdit ? "Simpan Perubahan" : "Tambah Produk"}
        </Button>
      </div>
    </form>
  );
}
