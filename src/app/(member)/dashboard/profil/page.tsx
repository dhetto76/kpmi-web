import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { activeReferenceNames } from "@/lib/settings";
import { ProfileForm } from "./profile-form";

export const metadata = { title: "Profil Saya" };

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/masuk");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const korwilOptions = await activeReferenceNames("korwil");

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
        email={user.email ?? ""}
        userId={user.id}
        korwilOptions={korwilOptions}
      />
    </div>
  );
}
