import { Form, Link, data, redirect, useNavigation } from "react-router";
import { AlertCircle, CheckCircle2, Lock } from "lucide-react";
import type { Route } from "./+types/daftar";
import { createClient } from "@/lib/supabase/server";
import { signUpSchema } from "@/lib/validations";
import { getSiteSettings, isEnabled } from "@/lib/settings.server";
import { Button, Card, Field, Input } from "@/components/ui";

export const meta: Route.MetaFunction = () => [{ title: "Daftar Anggota | KPMI" }];

/**
 * Registration, gated by the `registration_open` setting.
 *
 * The action enforces the same rule — this only avoids presenting a form that
 * is guaranteed to be refused.
 */
export async function loader({ request }: Route.LoaderArgs) {
  const { supabase, headers } = createClient(request);
  const settings = await getSiteSettings(supabase);

  return data(
    {
      registrationOpen: isEnabled(settings.registration_open),
      orgEmail: settings.org_email,
    },
    { headers },
  );
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();

  const parsed = signUpSchema.safeParse({
    full_name: formData.get("full_name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirm_password: formData.get("confirm_password"),
  });

  if (!parsed.success) {
    return data({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { supabase, headers } = createClient(request);

  // Enforced here, not only by hiding the form: this is a public POST
  // endpoint, so a closed registration has to be refused on the server.
  const settings = await getSiteSettings(supabase);
  if (!isEnabled(settings.registration_open)) {
    return data(
      {
        error:
          "Pendaftaran anggota baru sedang ditutup. Silakan hubungi sekretariat KPMI.",
      },
      { status: 403, headers },
    );
  }

  // `headers()` from next/headers; the request URL carries the same origin.
  const origin = new URL(request.url).origin;

  const { data: result, error } = await supabase.auth.signUp({
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
      return data({ error: "Email ini sudah terdaftar. Silakan masuk." }, {
        status: 400,
        headers,
      });
    }
    // Supabase's built-in SMTP is capped at a few messages per hour. Without a
    // custom SMTP provider this is the limit real signups will hit first, and
    // "coba lagi" is misleading when retrying immediately cannot work.
    if (error.code === "over_email_send_rate_limit") {
      return data(
        {
          error:
            "Terlalu banyak percobaan pendaftaran saat ini. Silakan coba lagi dalam satu jam.",
        },
        { status: 429, headers },
      );
    }
    return data({ error: "Pendaftaran gagal. Silakan coba lagi." }, {
      status: 400,
      headers,
    });
  }

  // Optional: skip the verification queue. Done through a security definer
  // function because the escalation guard refuses a member changing their own
  // status, which is exactly the protection that must stay in place.
  if (isEnabled(settings.auto_approve_members) && result.user) {
    await supabase.rpc("auto_approve_new_member", { target_id: result.user.id });
  }

  // When the project requires email confirmation, signUp returns a user but no
  // session — the account exists yet cannot sign in until the link is clicked.
  // Redirecting to /dashboard here would bounce off the guard straight back to
  // /masuk, which reads to the user as "registration failed". Tell them to
  // check their inbox instead.
  if (!result.session) {
    return data(
      {
        notice:
          "Akun berhasil dibuat. Kami sudah mengirim tautan konfirmasi ke email Anda — silakan buka email dan klik tautan tersebut untuk mengaktifkan akun.",
      },
      { headers },
    );
  }

  return redirect("/dashboard", { headers });
}

export default function SignUpPage({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const { registrationOpen, orgEmail } = loaderData;
  const pending = useNavigation().state === "submitting";

  const error = actionData && "error" in actionData ? actionData.error : null;
  const notice = actionData && "notice" in actionData ? actionData.notice : null;

  if (!registrationOpen) {
    return (
      <Card className="p-8 text-center">
        <div className="bg-maroon-deep mx-auto grid h-14 w-14 place-items-center rounded-xl text-gold-300">
          <Lock size={24} />
        </div>
        <h1 className="mt-5 font-display text-2xl font-extrabold text-maroon-900">
          Pendaftaran Ditutup
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm text-gray-600">
          Pendaftaran anggota baru sedang ditutup sementara. Silakan hubungi
          sekretariat KPMI di{" "}
          <a
            href={`mailto:${orgEmail}`}
            className="font-semibold text-maroon-600 hover:underline"
          >
            {orgEmail}
          </a>{" "}
          untuk informasi lebih lanjut.
        </p>
        <p className="mt-6 text-sm text-gray-600">
          Sudah punya akun?{" "}
          <Link to="/masuk" className="font-bold text-maroon-600 hover:underline">
            Masuk di sini
          </Link>
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-8">
      <h1 className="font-display text-2xl font-extrabold text-maroon-900">
        Daftar Anggota
      </h1>
      <p className="mt-1 text-sm text-gray-600">
        Buat akun dulu — data usaha bisa dilengkapi setelahnya.
      </p>
      <div className="gold-rule mt-5 w-16" />

      <ol className="mt-6 flex items-center gap-2 text-xs font-medium">
        <li className="flex items-center gap-1.5 text-maroon-600">
          <span className="grid h-5 w-5 place-items-center rounded-full bg-maroon-600 text-[10px] font-bold text-white">
            1
          </span>
          Akun
        </li>
        <span className="h-px flex-1 bg-gray-200" />
        <li className="flex items-center gap-1.5 text-gray-400">
          <span className="grid h-5 w-5 place-items-center rounded-full bg-gray-200 text-[10px] font-bold">
            2
          </span>
          Profil
        </li>
        <span className="h-px flex-1 bg-gray-200" />
        <li className="flex items-center gap-1.5 text-gray-400">
          <span className="grid h-5 w-5 place-items-center rounded-full bg-gray-200 text-[10px] font-bold">
            3
          </span>
          Usaha
        </li>
      </ol>

      {error && (
        <div className="mt-6 flex items-start gap-2.5 rounded-lg bg-red-50 p-3.5 text-sm text-red-700">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {notice ? (
        <div className="mt-6">
          <div className="flex items-start gap-2.5 rounded-lg bg-green-50 p-3.5 text-sm text-green-800">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
            <span>{notice}</span>
          </div>
          <p className="mt-5 text-center text-sm text-gray-600">
            Sudah mengonfirmasi email?{" "}
            <Link to="/masuk" className="font-bold text-maroon-600 hover:underline">
              Masuk di sini
            </Link>
          </p>
        </div>
      ) : (
        <Form method="post" className="mt-6 space-y-4">
          <Field label="Nama Lengkap" required>
            <Input name="full_name" required autoComplete="name" placeholder="Nama lengkap Anda" />
          </Field>

          <Field label="Email" required>
            <Input
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="nama@email.com"
            />
          </Field>

          <Field label="Kata Sandi" required hint="Minimal 8 karakter">
            <Input
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="••••••••"
            />
          </Field>

          <Field label="Konfirmasi Kata Sandi" required>
            <Input
              name="confirm_password"
              type="password"
              required
              autoComplete="new-password"
              placeholder="••••••••"
            />
          </Field>

          <Button type="submit" size="lg" disabled={pending} className="w-full">
            {pending ? "Memproses…" : "Buat Akun"}
          </Button>
        </Form>
      )}

      {!notice && (
        <>
          <ul className="mt-6 space-y-1.5 border-t border-gray-100 pt-5 text-xs text-gray-500">
            {[
              "Gratis, tanpa biaya pendaftaran",
              "Data usaha bisa dilengkapi kapan saja",
              "Keanggotaan diverifikasi oleh pengurus",
            ].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <CheckCircle2 size={14} className="shrink-0 text-green-600" />
                {t}
              </li>
            ))}
          </ul>

          <p className="mt-6 text-center text-sm text-gray-600">
            Sudah punya akun?{" "}
            <Link to="/masuk" className="font-bold text-maroon-600 hover:underline">
              Masuk di sini
            </Link>
          </p>
        </>
      )}
    </Card>
  );
}
