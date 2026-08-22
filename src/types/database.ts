/**
 * Database types.
 *
 * Hand-written for now so the app compiles before a Supabase project exists.
 * Once the project is live, replace this file with generated output:
 *
 *   npx supabase gen types typescript --project-id <id> > src/types/database.ts
 *
 * After that it is GENERATED — do not hand-edit.
 */

export type UserRole = "member" | "admin_korwil" | "super_admin";
export type ApprovalStatus = "pending" | "approved" | "rejected";

export interface Profile {
  id: string;
  full_name: string;
  phone: string | null;
  city: string | null;
  korwil: string | null;
  avatar_url: string | null;
  bio: string | null;
  referral: string | null;
  join_reason: string | null;
  kes: string | null;
  role: UserRole;
  /** Region this profile administers. Only set for role = "admin_korwil". */
  managed_korwil: string | null;
  status: ApprovalStatus;
  created_at: string;
  updated_at: string;
}

export interface Business {
  id: string;
  owner_id: string;

  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  cover_url: string | null;

  legal_form: string | null;
  npwp: string | null;
  siup: string | null;
  founded_year: number | null;

  address: string | null;
  city: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  website: string | null;

  industry: string | null;
  product_category: string | null;
  business_role: string | null;

  annual_revenue: string | null;
  employee_count: string | null;
  office_status: string | null;
  market: string | null;
  production_method: string | null;
  has_branches: boolean | null;
  branch_count: number | null;
  has_marketing_team: boolean | null;
  separate_finances: string | null;
  bookkeeping_method: string | null;
  has_finance_staff: string | null;
  has_management_team: string | null;

  status: ApprovalStatus;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  business_id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number | null;
  price_unit: string | null;
  category: string | null;
  images: string[];
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  kind: "business" | "product";
  sort_order: number;
}

/** A product joined to its owning business — the shape browse pages need. */
export type ProductWithBusiness = Product & {
  business: Pick<Business, "id" | "name" | "slug" | "city" | "logo_url">;
};

/** A business joined to its owner. */
export type BusinessWithOwner = Business & {
  owner: Pick<Profile, "id" | "full_name" | "korwil" | "avatar_url">;
};
