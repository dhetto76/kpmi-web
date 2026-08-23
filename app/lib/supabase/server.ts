import {
  createServerClient,
  parseCookieHeader,
  serializeCookieHeader,
} from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

/**
 * Supabase client for loaders and actions.
 *
 * Next.js refreshed the session in middleware and let every Server Component
 * read cookies ambiently. React Router has neither: there is no middleware and
 * no ambient request. So each loader/action builds its own client from the
 * request, and any refreshed session cookie is written to `headers`, which the
 * caller MUST return on its response — otherwise the rotated refresh token is
 * dropped and the user is silently signed out on the next request.
 *
 *   const { supabase, headers } = createClient(request);
 *   const { data } = await supabase.auth.getUser();
 *   return data(payload, { headers });
 *
 * Always create a new one per request — never share across requests.
 */
export function createClient(request: Request) {
  const headers = new Headers();

  const supabase = createServerClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return parseCookieHeader(request.headers.get("Cookie") ?? "").map(
            (cookie) => ({ ...cookie, value: cookie.value ?? "" }),
          );
        },
        setAll(cookiesToSet, cacheHeaders) {
          for (const { name, value, options } of cookiesToSet) {
            headers.append(
              "Set-Cookie",
              serializeCookieHeader(name, value, options),
            );
          }
          // Cache-Control/Expires/Pragma, so a CDN never caches a response
          // that carries a session cookie.
          for (const [key, value] of Object.entries(cacheHeaders ?? {})) {
            headers.set(key, value);
          }
        },
      },
    },
  );

  return { supabase, headers };
}
