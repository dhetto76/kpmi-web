"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { updateProfile } from "../actions";
import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import { ImageUpload } from "@/components/ui/image-upload";
import { KES } from "@/lib/reference-data";
import type { Profile } from "@/types/database";

export function ProfileForm({
  profile,
  email,
  userId,
  korwilOptions,
}: {
  profile: Profile | null;
  email: string;
  userId: string;
  /** Active korwil, from the list administrators maintain. */
  korwilOptions: string[];
}) {
  const [message, setMessage] = useState<
    { type: "ok" | "error"; text: string } | null
  >(null);
  const [pending, startTransition] = useTransition();

  // Keep the member's saved korwil selectable even if it has since been
  // retired, so opening the form does not silently blank their region.
  const korwilList =
    profile?.korwil && !korwilOptions.includes(profile.korwil)
      ? [...korwilOptions, profile.korwil]
      : korwilOptions;

  function onSubmit(formData: FormData) {
    setMessage(null);
    startTransition(async () => {
      const result = await updateProfile(formData);
      setMessage(
        "error" in result
          ? { type: "error", text: result.error }
          : { type: "ok", text: "Profil berhasil disimpan." },
      );
    });
  }

  return (
    <form action={onSubmit}>
      <Card className="p-6">
        {message && (
          <div
            className={`mb-5 flex items-start gap-2.5 rounded-lg p-3.5 text-sm ${
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

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Foto Profil">
              <ImageUpload
                name="avatar_url"
                bucket="avatars"
                userId={userId}
                defaultValue={profile?.avatar_url}
                label="Unggah foto"
              />
            </Field>
          </div>

          <div className="sm:col-span-2">
            <Field label="Nama Lengkap" required>
              <Input name="full_name" defaultValue={profile?.full_name ?? ""} required />
            </Field>
          </div>

          <Field label="Email" hint="Email tidak dapat diubah di sini">
            <Input value={email} disabled />
          </Field>

          <Field label="Nomor HP / WhatsApp">
            <Input name="phone" defaultValue={profile?.phone ?? ""} placeholder="08xxxxxxxxxx" />
          </Field>

          <Field label="Koordinator Wilayah">
            <Select name="korwil" defaultValue={profile?.korwil ?? ""}>
              <option value="">— Pilih korwil —</option>
              {korwilList.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Kota">
            <Input name="city" defaultValue={profile?.city ?? ""} />
          </Field>

          <Field label="Angkatan KES" hint="KPMI Entrepreneur School">
            <Select name="kes" defaultValue={profile?.kes ?? ""}>
              <option value="">— Pilih —</option>
              {KES.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Tahu KPMI dari?">
            <Input
              name="referral"
              defaultValue={profile?.referral ?? ""}
              placeholder="Teman, media sosial, kajian…"
            />
          </Field>

          <div className="sm:col-span-2">
            <Field label="Alasan Bergabung">
              <Textarea
                name="join_reason"
                defaultValue={profile?.join_reason ?? ""}
                placeholder="Apa yang Anda harapkan dari keanggotaan KPMI?"
              />
            </Field>
          </div>

          <div className="sm:col-span-2">
            <Field label="Tentang Saya">
              <Textarea
                name="bio"
                defaultValue={profile?.bio ?? ""}
                placeholder="Ceritakan singkat tentang diri dan usaha Anda."
              />
            </Field>
          </div>
        </div>

        <div className="mt-6 flex justify-end border-t border-gray-100 pt-5">
          <Button type="submit" disabled={pending} size="lg">
            {pending ? "Menyimpan…" : "Simpan Profil"}
          </Button>
        </div>
      </Card>
    </form>
  );
}
