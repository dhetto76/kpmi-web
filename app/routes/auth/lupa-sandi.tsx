import { Form, Link, data, useNavigation } from "react-router";
import { CheckCircle2, AlertCircle, Mail, Phone } from "lucide-react";
import type { Route } from "./+types/lupa-sandi";
import { createClient } from "@/lib/supabase/server";
import { resetPasswordSchema } from "@/lib/validations";
import { Button, Card, Field, Input } from "@/components/ui";
import { EMAIL_ENABLED, ORG } from "@/content/site";

export const meta: Route.MetaFunction = () => [{ title: "Lupa Kata Sandi | KPMI" }];

export async function action({ request }: Route.ActionArgs) {
  // The UI hides the form while EMAIL_ENABLED is false, but this is a public
  // endpoint — guard it here too rather than trusting the client. Reported as
  // success so the endpoint still cannot be used to probe accounts.
  if (!EMAIL_ENABLED) {
    return data({ sent: true as const });
  }

  const formData = await request.formData();
  const parsed = resetPasswordSchema.safeParse({ email: formData.get("email") });

  if (!parsed.success) {
    return data({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { supabase, headers } = createClient(request);
  const origin = new URL(request.url).origin;

  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/callback?next=/dashboard/pengaturan`,
  });

  // Always report success so the form cannot be used to probe for accounts.
  return data({ sent: true as const }, { headers });
}

export default function ForgotPasswordPage({ actionData }: Route.ComponentProps) {
  const pending = useNavigation().state === "submitting";
  const sent = actionData && "sent" in actionData;
  const error = actionData && "error" in actionData ? actionData.error : null;

  // No SMTP provider yet, so a reset email would never arrive. Point people at
  // the sekretariat rather than showing a form that silently does nothing.
  if (!EMAIL_ENABLED) {
    return (
      <Card className="p-8">
        <h1 className="font-display text-2xl font-extrabold text-maroon-900">
          Lupa Kata Sandi
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Pengaturan ulang kata sandi lewat email belum tersedia. Silakan hubungi
          sekretariat dan kami akan membantu memulihkan akun Anda.
        </p>
        <div className="gold-rule mt-5 w-16" />

        <div className="mt-6 space-y-3">
          <a
            href={`mailto:${ORG.email}`}
            className="flex items-center gap-3 rounded-lg border border-gray-200 p-3.5 text-sm font-medium text-gray-700 transition-colors hover:border-maroon-200 hover:bg-maroon-50"
          >
            <Mail size={18} className="shrink-0 text-maroon-600" />
            {ORG.email}
          </a>
          <a
            href={`tel:${ORG.phone.replace(/\s/g, "")}`}
            className="flex items-center gap-3 rounded-lg border border-gray-200 p-3.5 text-sm font-medium text-gray-700 transition-colors hover:border-maroon-200 hover:bg-maroon-50"
          >
            <Phone size={18} className="shrink-0 text-maroon-600" />
            {ORG.phone}
          </a>
        </div>

        <p className="mt-6 text-center text-sm text-gray-600">
          <Link to="/masuk" className="font-bold text-maroon-600 hover:underline">
            Kembali ke halaman masuk
          </Link>
        </p>
      </Card>
    );
  }

  if (sent) {
    return (
      <Card className="p-8 text-center">
        <CheckCircle2 size={44} className="mx-auto text-green-600" />
        <h1 className="mt-4 font-display text-xl font-extrabold text-maroon-900">
          Periksa email Anda
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Jika email tersebut terdaftar, kami telah mengirimkan tautan untuk
          mengatur ulang kata sandi.
        </p>
        <Link
          to="/masuk"
          className="mt-6 inline-block text-sm font-bold text-maroon-600 hover:underline"
        >
          Kembali ke halaman masuk
        </Link>
      </Card>
    );
  }

  return (
    <Card className="p-8">
      <h1 className="font-display text-2xl font-extrabold text-maroon-900">
        Lupa Kata Sandi
      </h1>
      <p className="mt-1 text-sm text-gray-600">
        Masukkan email Anda dan kami kirimkan tautan untuk mengatur ulang.
      </p>
      <div className="gold-rule mt-5 w-16" />

      {error && (
        <div className="mt-6 flex items-start gap-2.5 rounded-lg bg-red-50 p-3.5 text-sm text-red-700">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Form method="post" className="mt-6 space-y-4">
        <Field label="Email" required>
          <Input name="email" type="email" required placeholder="nama@email.com" />
        </Field>
        <Button type="submit" size="lg" disabled={pending} className="w-full">
          {pending ? "Mengirim…" : "Kirim Tautan"}
        </Button>
      </Form>

      <p className="mt-6 text-center text-sm text-gray-600">
        <Link to="/masuk" className="font-bold text-maroon-600 hover:underline">
          Kembali ke halaman masuk
        </Link>
      </p>
    </Card>
  );
}
