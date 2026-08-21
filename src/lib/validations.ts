import { z } from "zod";
import {
  KORWIL, JENIS_BADAN_USAHA, JENIS_USAHA, PRODUCT_CATEGORY,
  OMSET_PER_TAHUN, JUMLAH_KARYAWAN, STATUS_KANTOR, PASAR,
  LAPORAN_TERPISAH, MEMBUAT_LAPORAN_KEUANGAN, KARYAWAN_KEUANGAN,
  TIM_PENGELOLA, PABRIK, ROLE_USAHA, KES,
} from "./reference-data";

/**
 * One schema per form, used by both the client (react-hook-form) and the
 * server action. Validating in both places means the UI gives fast feedback
 * and the server never trusts the client.
 */

const optionalString = z.string().trim().optional().or(z.literal(""));

/* ------------------------------------------------------------------ Auth */

export const signInSchema = z.object({
  email: z.string().email("Masukkan alamat email yang valid"),
  password: z.string().min(1, "Kata sandi wajib diisi"),
});

export const signUpSchema = z
  .object({
    full_name: z.string().trim().min(2, "Nama lengkap wajib diisi"),
    email: z.string().email("Masukkan alamat email yang valid"),
    password: z.string().min(8, "Kata sandi minimal 8 karakter"),
    confirm_password: z.string(),
  })
  .refine((d) => d.password === d.confirm_password, {
    message: "Konfirmasi kata sandi tidak cocok",
    path: ["confirm_password"],
  });

export const resetPasswordSchema = z.object({
  email: z.string().email("Masukkan alamat email yang valid"),
});

/* --------------------------------------------------------------- Profile */

export const profileSchema = z.object({
  full_name: z.string().trim().min(2, "Nama lengkap wajib diisi"),
  avatar_url: optionalString,
  phone: optionalString,
  city: optionalString,
  korwil: z.enum(KORWIL).optional().or(z.literal("")),
  bio: optionalString,
  referral: optionalString,
  join_reason: optionalString,
  kes: z.enum(KES).optional().or(z.literal("")),
});

/* -------------------------------------------------------------- Business */

export const businessSchema = z.object({
  name: z.string().trim().min(2, "Nama usaha wajib diisi"),
  description: optionalString,

  // Public URLs returned by Supabase Storage after upload.
  logo_url: optionalString,
  cover_url: optionalString,

  legal_form: z.enum(JENIS_BADAN_USAHA).optional().or(z.literal("")),
  npwp: optionalString,
  siup: optionalString,
  founded_year: z.coerce
    .number()
    .int()
    .min(1900, "Tahun tidak valid")
    .max(new Date().getFullYear(), "Tahun tidak boleh di masa depan")
    .optional()
    .or(z.literal("")),

  address: optionalString,
  city: optionalString,
  phone: optionalString,
  whatsapp: optionalString,
  email: z.string().email("Email tidak valid").optional().or(z.literal("")),
  website: z.string().url("URL tidak valid").optional().or(z.literal("")),

  industry: z.enum(JENIS_USAHA).optional().or(z.literal("")),
  product_category: z.enum(PRODUCT_CATEGORY).optional().or(z.literal("")),
  business_role: z.enum(ROLE_USAHA).optional().or(z.literal("")),

  annual_revenue: z.enum(OMSET_PER_TAHUN).optional().or(z.literal("")),
  employee_count: z.enum(JUMLAH_KARYAWAN).optional().or(z.literal("")),
  office_status: z.enum(STATUS_KANTOR).optional().or(z.literal("")),
  market: z.enum(PASAR).optional().or(z.literal("")),
  production_method: z.enum(PABRIK).optional().or(z.literal("")),
  separate_finances: z.enum(LAPORAN_TERPISAH).optional().or(z.literal("")),
  bookkeeping_method: z.enum(MEMBUAT_LAPORAN_KEUANGAN).optional().or(z.literal("")),
  has_finance_staff: z.enum(KARYAWAN_KEUANGAN).optional().or(z.literal("")),
  has_management_team: z.enum(TIM_PENGELOLA).optional().or(z.literal("")),
  has_marketing_team: z.boolean().optional(),
  has_branches: z.boolean().optional(),
  branch_count: z.coerce.number().int().min(0).optional().or(z.literal("")),
});

/* --------------------------------------------------------------- Product */

export const productSchema = z.object({
  name: z.string().trim().min(2, "Nama produk wajib diisi"),
  description: optionalString,
  price: z.coerce.number().min(0, "Harga tidak boleh negatif").optional().or(z.literal("")),
  price_unit: optionalString,
  category: z.enum(PRODUCT_CATEGORY).optional().or(z.literal("")),
  // Collected from FormData.getAll(), so always an array.
  images: z.array(z.string()).default([]),
  is_published: z.boolean().default(false),
});

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type BusinessInput = z.infer<typeof businessSchema>;
export type ProductInput = z.infer<typeof productSchema>;
