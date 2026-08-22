"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { signInSchema, signUpSchema, resetPasswordSchema } from "@/lib/validations";
import { EMAIL_ENABLED } from "@/content/site";

export type ActionResult =
  | { error: string }
  | { success: true }
  | { success: true; message: string };

/**
 * Auth server actions.
 *
 * Each re-validates its input server-side — the client schema is for fast
 * feedback, never the security boundary.
 */

export async function signIn(formData: FormData): Promise<ActionResult> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    // An unconfirmed account is not a wrong password — saying so sends people
    // off resetting a password that was fine. This leaks nothing an attacker
    // could not already learn by signing up with the address.
    if (error.code === "email_not_confirmed") {
      return {
        error:
          "Email Anda belum dikonfirmasi. Silakan buka email dari kami dan klik tautan konfirmasi.",
      };
    }
    // Do not leak whether the address exists.
    return { error: "Email atau kata sandi salah." };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signUp(formData: FormData): Promise<ActionResult> {
  const parsed = signUpSchema.safeParse({
    full_name: formData.get("full_name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirm_password: formData.get("confirm_password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const origin = (await headers()).get("origin");

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      // Read by the handle_new_user trigger to populate profiles.full_name.
      data: { full_name: parsed.data.full_name },
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    if (error.message.includes("already registered")) {
      return { error: "Email ini sudah terdaftar. Silakan masuk." };
    }
    // Supabase's built-in SMTP is capped at a few messages per hour. Without a
    // custom SMTP provider this is the limit real signups will hit first, and
    // "coba lagi" is misleading when retrying immediately cannot work.
    if (error.code === "over_email_send_rate_limit") {
      return {
        error:
          "Terlalu banyak percobaan pendaftaran saat ini. Silakan coba lagi dalam satu jam.",
      };
    }
    return { error: "Pendaftaran gagal. Silakan coba lagi." };
  }

  // When the project requires email confirmation, signUp returns a user but no
  // session — the account exists yet cannot sign in until the link is clicked.
  // Redirecting to /dashboard here would bounce off the proxy straight back to
  // /masuk, which reads to the user as "registration failed". Tell them to
  // check their inbox instead.
  if (!data.session) {
    return {
      success: true,
      message:
        "Akun berhasil dibuat. Kami sudah mengirim tautan konfirmasi ke email Anda — silakan buka email dan klik tautan tersebut untuk mengaktifkan akun.",
    };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

export async function requestPasswordReset(formData: FormData): Promise<ActionResult> {
  // The UI hides the form while EMAIL_ENABLED is false, but a server action is
  // a public endpoint — guard it here too rather than trusting the client.
  // Reported as success so the endpoint still cannot be used to probe accounts.
  if (!EMAIL_ENABLED) {
    return { success: true };
  }

  const parsed = resetPasswordSchema.safeParse({ email: formData.get("email") });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const origin = (await headers()).get("origin");

  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/callback?next=/dashboard/pengaturan`,
  });

  // Always report success so the form cannot be used to probe for accounts.
  return { success: true };
}
