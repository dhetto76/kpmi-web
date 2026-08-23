import { Form, data, useNavigation } from "react-router";
import { CheckCircle2, AlertCircle } from "lucide-react";
import type { Route } from "./+types/profil";
import { requireUser } from "@/lib/auth.server";
import { activeReferenceNames } from "@/lib/settings.server";
import { profileSchema } from "@/lib/validations";
import { clean } from "@/lib/member.server";
import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import { ImageUpload } from "@/components/ui/image-upload";
import { KES } from "@/lib/reference-data";

export const meta: Route.MetaFunction = () => [{ title: "Profil Saya | KPMI" }];

export async function loader({ request }: Route.LoaderArgs) {
  const { user, supabase, headers } = await requireUser(request);

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const korwilOptions = await activeReferenceNames(supabase, "korwil");

  return data(
    { profile, email: user.email ?? "", userId: user.id, korwilOptions },
    { headers },
  );
}

export async function action({ request }: Route.ActionArgs) {
  // Guards again rather than trusting the layout: an action does not run
  // parent loaders, so this is the only check on the write path.
  const { user, supabase, headers } = await requireUser(request);

  const formData = await request.formData();
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return data({ error: parsed.error.issues[0].message }, { status: 400, headers });
  }

  const { error } = await supabase
    .from("profiles")
    .update(clean(parsed.data))
    .eq("id", user.id);

  if (error) {
    return data(
      { error: "Gagal menyimpan profil. Silakan coba lagi." },
      { status: 500, headers },
    );
  }

  // `revalidatePath` in Next.js. React Router re-runs this route's loader
  // after the action automatically, so the form reloads with saved values.
  return data({ ok: true as const }, { headers });
}

export default function ProfilePage({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const { profile, email, userId, korwilOptions } = loaderData;
  const pending = useNavigation().state === "submitting";

  const error = actionData && "error" in actionData ? actionData.error : null;
  const saved = actionData && "ok" in actionData;

  // Keep the member's saved korwil selectable even if it has since been
  // retired, so opening the form does not silently blank their region.
  const korwilList =
    profile?.korwil && !korwilOptions.includes(profile.korwil)
      ? [...korwilOptions, profile.korwil]
      : korwilOptions;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-maroon-900">
          Profil Saya
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Data ini tampil pada direktori anggota setelah keanggotaan disetujui.
        </p>
      </div>

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
              <span>{saved ? "Profil berhasil disimpan." : error}</span>
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
      </Form>
    </div>
  );
}
