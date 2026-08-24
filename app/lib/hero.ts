/**
 * Shape and limits of a homepage carousel slide.
 *
 * Split out of hero.server.ts because the admin editor needs these values at
 * runtime, not just as types, and the rest of that module pulls in the
 * Supabase client. Everything here is safe in the browser bundle.
 */

/** One row of `hero_slides` as stored. The admin editor works in these terms. */
export type HeroSlideRow = {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  image_url: string | null;
  gradient: string;
  primary_label: string;
  primary_href: string;
  secondary_label: string;
  secondary_href: string;
  is_active: boolean;
  sort_order: number;
};

/** The gradient a new slide starts with — the KPMI maroon used by most slides. */
export const DEFAULT_GRADIENT =
  "linear-gradient(135deg, #3d0000 0%, #6b0000 45%, #a51c2c 100%)";

/**
 * Paths the link pickers offer.
 *
 * A free-text href on a public banner is an open redirect waiting to happen,
 * and docs/hero-carousel.md already listed exactly these as the valid targets.
 * Keeping it a closed set means the editor can be two dropdowns and the action
 * can reject anything else outright.
 */
export const HERO_LINKS: { label: string; href: string }[] = [
  { label: "Beranda", href: "/" },
  { label: "Direktori Bisnis", href: "/bisnis" },
  { label: "Produk", href: "/produk" },
  { label: "Berita", href: "/berita" },
  { label: "Kontak", href: "/kontak" },
  { label: "Daftar Anggota", href: "/daftar" },
  { label: "Masuk", href: "/masuk" },
  { label: "Tentang KPMI", href: "/profil/tentang" },
  { label: "Visi & Misi", href: "/profil/visi-misi" },
  { label: "Struktur Organisasi", href: "/profil/struktur" },
];

const HERO_HREFS: readonly string[] = HERO_LINKS.map((link) => link.href);

export function isHeroHref(value: unknown): value is string {
  return typeof value === "string" && HERO_HREFS.includes(value);
}

export const HERO_LIMITS = {
  badge: 90,
  title: 90,
  subtitle: 260,
  label: 40,
  gradient: 300,
  imageUrl: 500,
} as const;

/** The most slides the dot indicators stay usable with. */
export const MAX_SLIDES = 8;

/* ------------------------------------------------------------- Validation */

export type HeroSlideInput = Omit<HeroSlideRow, "id" | "sort_order" | "is_active">;

/**
 * Reads and checks one slide's fields from a submitted form.
 *
 * Returns either the cleaned values or the first problem found, phrased for
 * the administrator. Over-long values are rejected rather than truncated: a
 * title cut off mid-word on the homepage would be reported as a bug later.
 */
export function parseHeroSlide(
  formData: FormData,
): { ok: true; value: HeroSlideInput } | { ok: false; error: string } {
  const read = (key: string) => String(formData.get(key) ?? "").trim();

  const title = read("title");
  if (title.length < 3) return { ok: false, error: "Judul minimal 3 karakter." };
  if (title.length > HERO_LIMITS.title) {
    return { ok: false, error: `Judul maksimal ${HERO_LIMITS.title} karakter.` };
  }

  const badge = read("badge");
  if (badge.length > HERO_LIMITS.badge) {
    return { ok: false, error: `Label atas maksimal ${HERO_LIMITS.badge} karakter.` };
  }

  const subtitle = read("subtitle");
  if (subtitle.length > HERO_LIMITS.subtitle) {
    return { ok: false, error: `Deskripsi maksimal ${HERO_LIMITS.subtitle} karakter.` };
  }

  const primaryLabel = read("primary_label");
  const secondaryLabel = read("secondary_label");
  for (const label of [primaryLabel, secondaryLabel]) {
    if (label.length > HERO_LIMITS.label) {
      return { ok: false, error: `Teks tombol maksimal ${HERO_LIMITS.label} karakter.` };
    }
  }

  const primaryHref = read("primary_href");
  const secondaryHref = read("secondary_href");
  if (!isHeroHref(primaryHref) || !isHeroHref(secondaryHref)) {
    return { ok: false, error: "Tujuan tombol tidak dikenal." };
  }

  const gradient = read("gradient") || DEFAULT_GRADIENT;
  if (gradient.length > HERO_LIMITS.gradient) {
    return { ok: false, error: "Gradasi warna terlalu panjang." };
  }
  // The value goes straight into a style attribute. Anything with a quote,
  // semicolon, or angle bracket could break out of the declaration, and every
  // legible gradient is spelled without them.
  if (/[";'`{}\\<>]/.test(gradient)) {
    return {
      ok: false,
      error: "Gradasi warna mengandung karakter yang tidak diizinkan.",
    };
  }

  const imageUrl = read("image_url");
  if (imageUrl.length > HERO_LIMITS.imageUrl) {
    return { ok: false, error: "Alamat gambar terlalu panjang." };
  }
  // Site-relative paths (the seeded slides) and uploads (absolute https URLs)
  // only — never javascript: or data:.
  if (imageUrl && !imageUrl.startsWith("/") && !imageUrl.startsWith("https://")) {
    return { ok: false, error: "Gambar harus diunggah atau berupa path di situs ini." };
  }

  return {
    ok: true,
    value: {
      badge,
      title,
      subtitle,
      image_url: imageUrl || null,
      gradient,
      primary_label: primaryLabel,
      primary_href: primaryHref,
      secondary_label: secondaryLabel,
      secondary_href: secondaryHref,
    },
  };
}
