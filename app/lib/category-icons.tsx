import {
  ArrowLeftRight,
  Building2,
  Car,
  Cog,
  Cpu,
  Fish,
  FlaskConical,
  Flower2,
  Gem,
  Hammer,
  HardHat,
  Lamp,
  Landmark,
  Leaf,
  Package,
  Pickaxe,
  Plane,
  Shirt,
  ShoppingBag,
  Sparkles,
  Sprout,
  Stethoscope,
  TreePalm,
  UtensilsCrossed,
  Wheat,
  Zap,
  type LucideIcon,
} from "lucide-react";

import type { JenisUsaha, ProductCategory } from "@/lib/reference-data";

/**
 * Icons stand in for a business logo or product photo the member has not
 * uploaded yet. Keys are the verbatim JENIS_USAHA / PRODUCT_CATEGORY values
 * from reference-data.ts. An unrecognised value falls back to the generic
 * icon, so adding a category degrades gracefully rather than breaking.
 */

const BUSINESS_ICONS: Record<JenisUsaha, LucideIcon> = {
  Agribisnis: Sprout,
  "Jasa Pariwisata": TreePalm,
  "Kima Petrokimia": FlaskConical,
  Kuliner: UtensilsCrossed,
  "Lembaga Keuangan": Landmark,
  Pertambangan: Pickaxe,
  "Pharmacy Herbal": Leaf,
  "Properti Kontraktor": HardHat,
  Retail: ShoppingBag,
  "Telekomunikasi IT": Cpu,
  "Tour Travel": Plane,
  Trading: ArrowLeftRight,
  Other: Building2,
};

const PRODUCT_ICONS: Record<ProductCategory, LucideIcon> = {
  "Agriculture And Fresh Product": Wheat,
  "Automotive, Spare Parts and Accessories": Car,
  "Beauty And Personal Care": Sparkles,
  "Energy And Mineral": Zap,
  Fashion: Shirt,
  Fisheries: Fish,
  "Flower and ornamental plant": Flower2,
  "Food and Beverages": UtensilsCrossed,
  "Handy Craft": Hammer,
  "Health & Medical": Stethoscope,
  "Home Appliance": Lamp,
  "Jewellery And Watches": Gem,
  Mechanicals: Cog,
};

/** Icon for a business industry. Falls back to a generic building. */
export function businessIcon(industry?: string | null): LucideIcon {
  if (!industry) return Building2;
  return BUSINESS_ICONS[industry as JenisUsaha] ?? Building2;
}

/** Icon for a product category. Falls back to a generic package. */
export function productIcon(category?: string | null): LucideIcon {
  if (!category) return Package;
  return PRODUCT_ICONS[category as ProductCategory] ?? Package;
}

/**
 * Render helpers, so call sites pass a category instead of resolving an icon
 * themselves. Both maps hold stable module-level components, so the lookup
 * below returns an existing component rather than defining a new one per
 * render — hence the narrowly scoped rule suppressions.
 */

type IconProps = { size?: number; className?: string; strokeWidth?: number };

export function BusinessIcon({
  industry,
  ...props
}: IconProps & { industry?: string | null }) {
  const Icon = businessIcon(industry);
  // eslint-disable-next-line react-hooks/static-components
  return <Icon {...props} />;
}

export function ProductIcon({
  category,
  ...props
}: IconProps & { category?: string | null }) {
  const Icon = productIcon(category);
  // eslint-disable-next-line react-hooks/static-components
  return <Icon {...props} />;
}
