import { createClient } from "@/lib/supabase/server";
import { JENIS_USAHA, KORWIL, PRODUCT_CATEGORY } from "@/lib/reference-data";

/**
 * Runtime reference lists and site settings.
 *
 * The lists in reference-data.ts are the seed and the compile-time types; the
 * `reference_values` table is the runtime authority, so an administrator can
 * add a korwil without a deploy.
 *
 * Every read falls back to the hard-coded array. The database is reachable in
 * practice, but a settings page that empties every korwil dropdown across the
 * public site on a transient error is a worse failure than slightly stale
 * options.
 */

export type ReferenceKind = "korwil" | "product_category" | "industry";

export const REFERENCE_KINDS: readonly ReferenceKind[] = [
  "korwil",
  "product_category",
  "industry",
];

export type ReferenceValue = {
  id: string;
  kind: ReferenceKind;
  name: string;
  slug: string;
  is_active: boolean;
  sort_order: number;
};

/** Seed used when the table is unreachable, keyed by kind. */
const FALLBACK: Record<ReferenceKind, readonly string[]> = {
  korwil: KORWIL,
  product_category: PRODUCT_CATEGORY,
  industry: JENIS_USAHA,
};

/** UI labels for each list. Used by the settings pages and their headings. */
export const REFERENCE_META: Record<
  ReferenceKind,
  { title: string; singular: string; desc: string }
> = {
  korwil: {
    title: "Korwil",
    singular: "korwil",
    desc: "Koordinator wilayah tempat anggota terdaftar. Dipakai di pendaftaran, filter direktori, dan cakupan Admin Korwil.",
  },
  product_category: {
    title: "Kategori Produk",
    singular: "kategori",
    desc: "Kategori yang dipilih anggota saat menambahkan produk, dan yang dipakai pengunjung untuk menelusuri katalog.",
  },
  industry: {
    title: "Industri",
    singular: "industri",
    desc: "Sektor usaha yang dipilih anggota pada profil usahanya, dipakai sebagai filter di direktori usaha.",
  },
};

/**
 * All entries of one kind, including inactive ones — the admin list needs to
 * show what has been retired so it can be brought back.
 */
export async function listReferenceValues(
  kind: ReferenceKind,
): Promise<ReferenceValue[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reference_values")
    .select("id, kind, name, slug, is_active, sort_order")
    .eq("kind", kind)
    .order("sort_order")
    .order("name");

  if (error || !data || data.length === 0) {
    // No id means these are placeholders; the admin UI keys off `id` and
    // renders them read-only rather than offering edits that cannot save.
    return FALLBACK[kind].map((name, index) => ({
      id: "",
      kind,
      name,
      slug: "",
      is_active: true,
      sort_order: (index + 1) * 10,
    }));
  }

  return data as ReferenceValue[];
}

/** Active names only — what a picker should offer for new records. */
export async function activeReferenceNames(
  kind: ReferenceKind,
): Promise<string[]> {
  const values = await listReferenceValues(kind);
  const active = values.filter((value) => value.is_active).map((value) => value.name);
  return active.length > 0 ? active : [...FALLBACK[kind]];
}

/* --------------------------------------------------------------- Settings */

export type SiteSettings = Record<string, string>;

/**
 * Defaults for every known setting. A key missing from the table (a fresh
 * database, or a setting added after the last seed) reads as its default
 * instead of undefined, so callers never branch on absence.
 */
export const SETTING_DEFAULTS = {
  org_email: "sekretariat@kpmi.or.id",
  org_phone: "+62 21 0000 0000",
  org_address: "Jakarta, Indonesia",
  org_tagline:
    "Bersama membangun ekosistem bisnis Islam yang kuat, halal, dan berkah.",
  registration_open: "true",
  auto_approve_members: "false",
  announcement: "",
} as const;

export type SettingKey = keyof typeof SETTING_DEFAULTS;

export const SETTING_KEYS = Object.keys(SETTING_DEFAULTS) as SettingKey[];

export async function getSiteSettings(): Promise<Record<SettingKey, string>> {
  const supabase = await createClient();
  const { data } = await supabase.from("site_settings").select("key, value");

  const settings = { ...SETTING_DEFAULTS } as Record<SettingKey, string>;
  for (const row of data ?? []) {
    if ((SETTING_KEYS as string[]).includes(row.key)) {
      settings[row.key as SettingKey] = row.value ?? "";
    }
  }
  return settings;
}

/** Settings stored as "true"/"false" strings. */
export function isEnabled(value: string | undefined): boolean {
  return value === "true";
}
