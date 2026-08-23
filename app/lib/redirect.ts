/**
 * Validates a `?next=` destination before redirecting to it.
 *
 * The guards put the user's intended path into `?next=`, but anything can put
 * a value there — `/masuk?next=https://evil.example` would otherwise turn the
 * sign-in form into an open redirect, which is a convincing phishing primitive
 * because the link genuinely starts on this site.
 *
 * Only a path on this origin is allowed through. Anything else falls back to
 * the default destination.
 */
export function safeRedirect(
  to: FormDataEntryValue | string | null | undefined,
  fallback = "/dashboard",
): string {
  if (typeof to !== "string" || to.length === 0) return fallback;

  // Must be a single-slash absolute path. This rejects absolute URLs
  // ("https://evil.example"), protocol-relative ones ("//evil.example", which
  // browsers treat as absolute), and backslash variants some parsers accept.
  if (!to.startsWith("/") || to.startsWith("//") || to.startsWith("/\\")) {
    return fallback;
  }

  return to;
}
