import { redirect } from "react-router";
import type { Route } from "./+types/keluar";
import { createClient } from "@/lib/supabase/server";

/**
 * Sign out.
 *
 * POST only. As a GET this would be triggerable by any third-party page
 * embedding `<img src="https://…/keluar">`, logging visitors out unprompted —
 * so the sign-out control must be a form, not a link.
 */
export async function action({ request }: Route.ActionArgs) {
  const { supabase, headers } = createClient(request);
  await supabase.auth.signOut();

  // `headers` carries the cookie clears that actually end the session.
  return redirect("/", { headers });
}

/** A stray GET (a bookmark, a refresh after signing out) just goes home. */
export async function loader() {
  return redirect("/");
}
