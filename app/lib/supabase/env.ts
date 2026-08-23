/**
 * Supabase connection details.
 *
 * The `NEXT_PUBLIC_` prefix meant something only to Next.js: it marked a
 * variable as safe to inline into the client bundle. Vite uses `VITE_` for the
 * same job. Both names are read here so an existing `.env.local` keeps working
 * through the migration; `VITE_` wins when both are set.
 *
 * The URL and anon key are public by design — they ship in the browser bundle
 * and RLS is what actually protects the data. The service-role key is not, and
 * is never read from this module.
 */

function read(viteName: string, legacyName: string): string {
  // `import.meta.env` is inlined at build time in the browser; `process.env`
  // is only populated on the server. Checking both keeps one source of truth
  // for code that runs in either place.
  const value =
    (typeof import.meta !== "undefined"
      ? (import.meta.env?.[viteName] as string | undefined)
      : undefined) ??
    (typeof process !== "undefined"
      ? (process.env?.[viteName] ?? process.env?.[legacyName])
      : undefined);

  if (!value) {
    throw new Error(
      `Missing ${viteName}. Copy .env.example to .env and fill it in.`,
    );
  }
  return value;
}

export const SUPABASE_URL = read("VITE_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL");
export const SUPABASE_ANON_KEY = read(
  "VITE_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
);
