import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_GRADIENT, HERO_LIMITS, parseHeroSlide } from "./hero.ts";

/**
 * The carousel is the first thing the public homepage paints, and every field
 * here is administrator-supplied. The gradient lands in a style attribute and
 * the image URL in a src, so both are checked as injection surfaces rather
 * than as formatting preferences.
 */

/** A submission with every field valid; individual tests override one key. */
function form(overrides: Record<string, string> = {}) {
  const fields: Record<string, string> = {
    badge: "Sejak 2010",
    title: "Membangun Bisnis yang Halal & Berkah",
    subtitle: "Bersama membangun ekosistem bisnis Islam yang kuat.",
    image_url: "/images/hero/jakarta.jpg",
    gradient: DEFAULT_GRADIENT,
    primary_label: "Gabung Sekarang",
    primary_href: "/daftar",
    secondary_label: "Jelajahi Direktori",
    secondary_href: "/bisnis",
    ...overrides,
  };

  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.append(key, value);
  return data;
}

/** The error message, or null when the submission was accepted. */
function errorOf(data: FormData) {
  const result = parseHeroSlide(data);
  return result.ok ? null : result.error;
}

test("accepts a complete slide and trims its text", () => {
  const result = parseHeroSlide(form({ title: "  Judul Banner  " }));
  assert.ok(result.ok);
  assert.equal(result.value.title, "Judul Banner");
  assert.equal(result.value.primary_href, "/daftar");
  assert.equal(result.value.image_url, "/images/hero/jakarta.jpg");
});

test("requires a usable title", () => {
  assert.match(errorOf(form({ title: "" }))!, /Judul minimal/);
  assert.match(errorOf(form({ title: "  " }))!, /Judul minimal/);
  assert.match(errorOf(form({ title: "ab" }))!, /Judul minimal/);
  assert.match(
    errorOf(form({ title: "x".repeat(HERO_LIMITS.title + 1) }))!,
    /Judul maksimal/,
  );
});

test("badge and subtitle are optional", () => {
  const result = parseHeroSlide(form({ badge: "", subtitle: "" }));
  assert.ok(result.ok);
  assert.equal(result.value.badge, "");
  assert.equal(result.value.subtitle, "");
});

test("rejects link targets outside the known set", () => {
  // An open redirect on a public banner.
  assert.ok(errorOf(form({ primary_href: "https://evil.example" })));
  assert.ok(errorOf(form({ primary_href: "//evil.example" })));
  assert.ok(errorOf(form({ primary_href: "javascript:alert(1)" })));
  // A real path that is simply not one of the offered destinations.
  assert.ok(errorOf(form({ secondary_href: "/admin" })));
  assert.ok(errorOf(form({ secondary_href: "" })));
});

test("rejects a gradient that could break out of the style attribute", () => {
  for (const gradient of [
    'red;background:url("x")',
    "red\" onload=\"alert(1)",
    "red'/*",
    "red</style><script>",
    "var(--x){}",
  ]) {
    assert.ok(
      errorOf(form({ gradient })),
      `expected rejection for gradient: ${gradient}`,
    );
  }
});

test("an empty gradient falls back to the house maroon", () => {
  const result = parseHeroSlide(form({ gradient: "" }));
  assert.ok(result.ok);
  assert.equal(result.value.gradient, DEFAULT_GRADIENT);
});

test("accepts the gradients the seeded slides use", () => {
  for (const gradient of [
    DEFAULT_GRADIENT,
    "linear-gradient(135deg, #2a0000 0%, #8b0000 55%, #c9a227 140%)",
    "radial-gradient(circle at 30% 20%, #5a0000, #2a0000)",
  ]) {
    assert.equal(errorOf(form({ gradient })), null, gradient);
  }
});

test("image must be an upload or a path on this site", () => {
  assert.ok(errorOf(form({ image_url: "javascript:alert(1)" })));
  assert.ok(errorOf(form({ image_url: "data:image/svg+xml,<svg onload=alert(1)>" })));
  assert.ok(errorOf(form({ image_url: "http://insecure.example/x.jpg" })));

  // Supabase Storage public URLs are absolute https.
  assert.equal(
    errorOf(form({ image_url: "https://abc.supabase.co/storage/v1/object/public/hero/x.jpg" })),
    null,
  );
});

test("an absent image is stored as null rather than an empty string", () => {
  const result = parseHeroSlide(form({ image_url: "" }));
  assert.ok(result.ok);
  assert.equal(result.value.image_url, null);
});

test("missing fields are treated as empty, not as undefined", () => {
  // A submission from an older cached page, or a hand-built request.
  const data = new FormData();
  data.append("title", "Judul Banner");
  data.append("primary_href", "/daftar");
  data.append("secondary_href", "/bisnis");

  const result = parseHeroSlide(data);
  assert.ok(result.ok);
  assert.equal(result.value.badge, "");
  assert.equal(result.value.primary_label, "");
  assert.equal(result.value.gradient, DEFAULT_GRADIENT);
});
