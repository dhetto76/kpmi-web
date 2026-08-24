import type { SupabaseClient } from "@supabase/supabase-js";
import { HERO_SLIDES, type HeroSlide } from "@/content/site";
import type { HeroSlideRow } from "@/lib/hero";

/**
 * Runtime homepage carousel.
 *
 * HERO_SLIDES in content/site.ts is the seed and the compile-time type; the
 * `hero_slides` table is the runtime authority, so a super admin can run an
 * event banner without a deploy.
 *
 * Reads fall back to the hard-coded array, exactly as the reference lists do.
 * A homepage whose hero is blank because of a transient database error is a
 * far worse failure than one showing last month's banner.
 *
 * The slide shape, field limits, validation, and the allowed link targets
 * live in lib/hero.ts — the admin editor needs them in the browser too.
 */

const COLUMNS =
  "id, badge, title, subtitle, image_url, gradient, primary_label, primary_href, secondary_label, secondary_href, is_active, sort_order";

/** A row in the shape the carousel component renders. */
export function toHeroSlide(row: HeroSlideRow): HeroSlide {
  return {
    badge: row.badge,
    title: row.title,
    subtitle: row.subtitle,
    image: row.image_url ?? undefined,
    gradient: row.gradient,
    primary: { label: row.primary_label, href: row.primary_href },
    secondary: { label: row.secondary_label, href: row.secondary_href },
  };
}

/**
 * Active slides for the public homepage, in display order.
 *
 * Falls back to the hard-coded array when the table is unreachable OR empty.
 * Empty counts as a failure here rather than as "show no banner": the hero is
 * the full first screen of the homepage, so an admin who hides every slide
 * gets the built-in set instead of a blank page.
 */
export async function getHeroSlides(supabase: SupabaseClient): Promise<HeroSlide[]> {
  const { data, error } = await supabase
    .from("hero_slides")
    .select(COLUMNS)
    .eq("is_active", true)
    .order("sort_order")
    .order("created_at");

  if (error || !data || data.length === 0) return HERO_SLIDES;

  return (data as HeroSlideRow[]).map(toHeroSlide);
}

/**
 * Every slide including hidden ones, for the admin editor — it has to show
 * what has been switched off so it can be switched back on.
 */
export async function listHeroSlides(
  supabase: SupabaseClient,
): Promise<{ slides: HeroSlideRow[]; isFallback: boolean }> {
  const { data, error } = await supabase
    .from("hero_slides")
    .select(COLUMNS)
    .order("sort_order")
    .order("created_at");

  if (error) {
    // No id means these are placeholders from the hard-coded array; the editor
    // renders them read-only rather than offering edits that cannot save.
    return {
      slides: HERO_SLIDES.map((slide, index) => ({
        id: "",
        badge: slide.badge,
        title: slide.title,
        subtitle: slide.subtitle,
        image_url: slide.image ?? null,
        gradient: slide.gradient,
        primary_label: slide.primary.label,
        primary_href: slide.primary.href,
        secondary_label: slide.secondary.label,
        secondary_href: slide.secondary.href,
        is_active: true,
        sort_order: (index + 1) * 10,
      })),
      isFallback: true,
    };
  }

  return { slides: (data ?? []) as HeroSlideRow[], isFallback: false };
}

