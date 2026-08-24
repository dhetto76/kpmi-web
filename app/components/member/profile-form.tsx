import { Form, useNavigation } from "react-router";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import { ImageUpload } from "@/components/ui/image-upload";
import { KES } from "@/lib/reference-data";

/** The subset of a profile this form edits. */
export type ProfileFormValues = {
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  city: string | null;
  korwil: string | null;
  kes: string | null;
  referral: string | null;
  join_reason: string | null;
  bio: string | null;
};

/**
 * The member profile form, shared by the member's own page and the admin
 * editor at /admin/anggota/:id.
 *
 * `uploadUserId` is whose storage folder an uploaded avatar lands in, and it
 * is the *caller's* id, not the profile's: the storage insert policy requires
 * the first path segment to be the uploader's own id. Buckets are publicly
 * readable, so the member's avatar renders regardless of whose folder holds
 * the file — the same arrangement the business and product forms already use.
 *
 * `canEditKorwil` is false for a korwil admin. The
 * prevent_profile_privilege_escalation trigger rejects a korwil change from
 * anyone but a super admin, so offering the field would only produce a save
 * that always fails.
 */
export function ProfileForm({
  profile,
  email,
  uploadUserId,
  korwilOptions,
  canEditKorwil,
  error,
  saved,
  savedMessage = "Profil berhasil disimpan.",
  submitLabel = "Simpan Profil",
}: {
  profile: ProfileFormValues | null;
  email?: string;
  uploadUserId: string;
  korwilOptions: string[];
  canEditKorwil: boolean;
  error: string | null;
  saved: boolean;
  savedMessage?: string;
  submitLabel?: string;
}) {
  const pending = useNavigation().state === "submitting";

  // Keep the saved korwil selectable even if it has since been retired, so
  // opening the form does not silently blank the member's region.
  const korwilList =
    profile?.korwil && !korwilOptions.includes(profile.korwil)
      ? [...korwilOptions, profile.korwil]
      : korwilOptions;

  return (
    <Form method="post">
      <Card className="p-6">
        {(error || saved) && (
          <div
            className={`mb-5 flex items-start gap-2.5 rounded-lg p-3.5 text-sm ${
              saved ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"
            }`}
          >
            {saved ? (
              <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
            ) : (
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
            )}
            <span>{saved ? savedMessage : error}</span>
          </div>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Foto Profil">
              <ImageUpload
                name="avatar_url"
                bucket="avatars"
                userId={uploadUserId}
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

          {email !== undefined && (
            <Field label="Email" hint="Email tidak dapat diubah di sini">
              <Input value={email} disabled />
            </Field>
          )}

          <Field label="Nomor HP / WhatsApp">
            <Input name="phone" defaultValue={profile?.phone ?? ""} placeholder="08xxxxxxxxxx" />
          </Field>

          <Field
            label="Koordinator Wilayah"
            hint={
              canEditKorwil
                ? undefined
                : "Hanya Super Admin yang dapat memindahkan anggota antar korwil"
            }
          >
            <Select
              name={canEditKorwil ? "korwil" : undefined}
              defaultValue={profile?.korwil ?? ""}
              disabled={!canEditKorwil}
            >
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
            {pending ? "Menyimpan…" : submitLabel}
          </Button>
        </div>
      </Card>
    </Form>
  );
}
