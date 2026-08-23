/**
 * Reference data extracted verbatim from the live KPMI WordPress registration
 * form (http://kpmi.or.id/register/) on 2026-08-20.
 *
 * These option sets are the real ones members already use. Do not invent or
 * "tidy" values here without confirming against the existing member data —
 * changing a label orphans existing records.
 */

/** 45 regional coordinators. Includes overseas chapters (Doha, Jeddah, Kairo). */
export const KORWIL = [
  "Aceh", "Balikpapan", "Bandung", "Banjarmasin", "Batam", "Bekasi",
  "Blitar", "Blora", "Bogor", "Cianjur", "Ciayumaja", "Cilacap",
  "Depok", "Doha", "Jakarta", "Jambi", "Jeddah", "Kairo",
  "Karawang", "Kediri", "Kuningan", "Lombok", "Lubuk Linggau", "Madiun",
  "Makassar", "Malang", "Medan", "Merauke", "Palangkaraya", "Palembang",
  "Pekalongan", "Pekanbaru", "Pontianak", "Priangan Timur", "Purwokerto",
  "Rokan Hilir", "Sampit", "Semarang", "Solo raya", "Sumatera Barat",
  "Sumbawa", "Surabaya", "Tangerang", "Tulungagung", "Yogyakarta",
] as const;

/** Legal form of the business entity. */
export const JENIS_BADAN_USAHA = [
  "PT", "CV", "Koperasi", "Perseroan Perorangan", "Lainnya",
] as const;

/** Industry sector. */
export const JENIS_USAHA = [
  "Agribisnis", "Jasa Pariwisata", "Kima Petrokimia", "Kuliner",
  "Lembaga Keuangan", "Pertambangan", "Pharmacy Herbal",
  "Properti Kontraktor", "Retail", "Telekomunikasi IT",
  "Tour Travel", "Trading", "Other",
] as const;

/** Product category — used for both businesses and products. */
export const PRODUCT_CATEGORY = [
  "Agriculture And Fresh Product",
  "Automotive, Spare Parts and Accessories",
  "Beauty And Personal Care",
  "Energy And Mineral",
  "Fashion",
  "Fisheries",
  "Flower and ornamental plant",
  "Food and Beverages",
  "Handy Craft",
  "Health & Medical",
  "Home Appliance",
  "Jewellery And Watches",
  "Mechanicals",
] as const;

/** Annual turnover band. */
export const OMSET_PER_TAHUN = [
  "Dibawah 500 Juta", "500 Juta - 1 Miliyar", "Diatas 1 Miliyar",
] as const;

/** Headcount band. */
export const JUMLAH_KARYAWAN = [
  "0 - 5 orang", "6 - 10 orang", "11- 50 orang",
  "51 - 100 orang", "Lebih dari 100 orang",
] as const;

/** Office ownership status. */
export const STATUS_KANTOR = ["Lainnya", "Milik Sendiri", "Sewa", "Virtual"] as const;

/** Market reach. */
export const PASAR = ["Domestik", "Ekspor", "Domestik dan Ekspor"] as const;

/** Are business finances separated from personal? */
export const LAPORAN_TERPISAH = ["Sudah", "Belum"] as const;

/** How financial reporting is done. */
export const MEMBUAT_LAPORAN_KEUANGAN = [
  "Menggunakan Software atau applikasi keuangan",
  "Menggunakan Spreadsheet Excel",
  "Memakai cara lainya",
] as const;

/** Is there dedicated finance staff? */
export const KARYAWAN_KEUANGAN = ["Memiliki", "Tidak Memiliki"] as const;

/** Is there a management team? */
export const TIM_PENGELOLA = ["Sudah Memiliki", "Belum Memiliki"] as const;

/** Production method. */
export const PABRIK = [
  "Menggunakan Pabrik sendiri", "Menggunakan Pabrik pihak lain",
] as const;

/** Role in the value chain. */
export const ROLE_USAHA = [
  "Produsen", "Trader", "Reseller", "Commision Agent", "Lainya",
] as const;

/** KPMI Entrepreneur School cohort. */
export const KES = [
  "Belum", "KES 1", "KES 2", "KES 3", "KES 4", "KES 5",
  "KES 6", "KES 7", "KES 8", "KES 9", "KES 10", "KES 11",
] as const;

export const YA_TIDAK = ["Ya", "Tidak"] as const;

export type Korwil = (typeof KORWIL)[number];
export type ProductCategory = (typeof PRODUCT_CATEGORY)[number];
export type JenisUsaha = (typeof JENIS_USAHA)[number];
