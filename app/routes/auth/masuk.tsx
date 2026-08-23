import {
  Form,
  Link,
  data,
  redirect,
  useNavigation,
  useSearchParams,
} from "react-router";
import { AlertCircle } from "lucide-react";
import type { Route } from "./+types/masuk";
import { createClient } from "@/lib/supabase/server";
import { signInSchema } from "@/lib/validations";
import { Button, Card, Field, Input } from "@/components/ui";
import { safeRedirect } from "@/lib/redirect";

export const meta: Route.MetaFunction = () => [{ title: "Masuk | KPMI" }];

/** Already signed in? Skip the form. */
export async function loader({ request }: Route.LoaderArgs) {
  const { supabase, headers } = createClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    throw redirect(safeRedirect(new URL(request.url).searchParams.get("next")), {
      headers,
    });
  }

  return data(null, { headers });
}

/**
 * Sign in.
 *
 * This was a Server Action returning `{ error }` to a `useTransition` handler.
 * As a route action the same result comes back through `actionData`, and the
 * form works without JavaScript.
 *
 * The `headers` from `createClient` carry the new session cookie — returning
 * them is what actually signs the user in. A redirect that drops them looks
 * like a successful login that immediately bounces back to this page.
 */
export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();

  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return data({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { supabase, headers } = createClient(request);
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    // An unconfirmed account is not a wrong password — saying so sends people
    // off resetting a password that was fine. This leaks nothing an attacker
    // could not already learn by signing up with the address.
    if (error.code === "email_not_confirmed") {
      return data(
        {
          error:
            "Email Anda belum dikonfirmasi. Silakan buka email dari kami dan klik tautan konfirmasi.",
        },
        { status: 400, headers },
      );
    }
    // Do not leak whether the address exists.
    return data({ error: "Email atau kata sandi salah." }, { status: 400, headers });
  }

  // `revalidatePath("/", "layout")` in Next.js. React Router re-runs the
  // loaders of the destination automatically, so no explicit call is needed.
  return redirect(safeRedirect(formData.get("next")), { headers });
}

export default function SignInPage({ actionData }: Route.ComponentProps) {
  // `useTransition`'s pending flag; this one also covers the no-JS case.
  const pending = useNavigation().state === "submitting";
  // Read from the router, not `document`, so the server and client agree.
  const [searchParams] = useSearchParams();
  const next = searchParams.get("next") ?? "";

  // Set by /auth/callback when a confirmation or reset link fails to exchange
  // — usually an expired or already-used link.
  const error =
    actionData?.error ??
    (searchParams.get("error") === "auth"
      ? "Tautan tidak valid atau sudah kedaluwarsa. Silakan masuk kembali."
      : null);

  return (
    <Card className="p-8">
      <h1 className="font-display text-2xl font-extrabold text-maroon-900">Masuk</h1>
      <p className="mt-1 text-sm text-gray-600">
        Masuk untuk mengelola profil, usaha, dan produk Anda.
      </p>
      <div className="gold-rule mt-5 w-16" />

      {error && (
        <div className="mt-6 flex items-start gap-2.5 rounded-lg bg-red-50 p-3.5 text-sm text-red-700">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Form method="post" className="mt-6 space-y-4">
        {/* Where the guard wanted to send them, carried through the POST. */}
        <input type="hidden" name="next" value={next} />

        <Field label="Email" required>
          <Input
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="nama@email.com"
          />
        </Field>

        <Field label="Kata Sandi" required>
          <Input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="••••••••"
          />
        </Field>

        <div className="text-right">
          <Link to="/lupa-sandi" className="text-sm font-medium text-maroon-600 hover:underline">
            Lupa kata sandi?
          </Link>
        </div>

        <Button type="submit" size="lg" disabled={pending} className="w-full">
          {pending ? "Memproses…" : "Masuk"}
        </Button>
      </Form>

      <p className="mt-6 text-center text-sm text-gray-600">
        Belum punya akun?{" "}
        <Link to="/daftar" className="font-bold text-maroon-600 hover:underline">
          Daftar sekarang
        </Link>
      </p>
    </Card>
  );
}
