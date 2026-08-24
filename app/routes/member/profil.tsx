import { data } from "react-router";
import type { Route } from "./+types/profil";
import { requireUser } from "@/lib/auth.server";
import { activeReferenceNames } from "@/lib/settings.server";
import { profileSchema } from "@/lib/validations";
import { clean } from "@/lib/member.server";
import { ProfileForm } from "@/components/member/profile-form";

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

  const error = actionData && "error" in actionData ? actionData.error : null;
  const saved = actionData !== undefined && "ok" in actionData;

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

      <ProfileForm
        profile={profile}
        email={email}
        uploadUserId={userId}
        korwilOptions={korwilOptions}
        canEditKorwil
        error={error}
        saved={saved}
      />
    </div>
  );
}
