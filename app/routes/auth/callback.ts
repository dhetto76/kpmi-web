import { redirect } from "react-router";
import type { Route } from "./+types/callback";
import { createClient } from "@/lib/supabase/server";
import { safeRedirect } from "@/lib/redirect";

/**
 * Exchanges the emailed code for a session, then forwards the user on.
 * Used by email confirmation and password reset links.
 *
 * A resource route: no default export, so it renders nothing and only
 * redirects — the Route Handler this replaces did the same.
 */
export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  // `next` arrives from a link in an email, so it is not trusted input.
  const next = safeRedirect(url.searchParams.get("next"));

  if (code) {
    const { supabase, headers } = createClient(request);
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    // `headers` carries the new session cookie; without it the exchange
    // succeeds server-side and the browser stays signed out.
    if (!error) return redirect(next, { headers });
  }

  return redirect("/masuk?error=auth");
}
