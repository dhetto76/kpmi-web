/**
 * Static site content: organization details, navigation, and page copy.
 *
 * Everything a non-developer might want changed on the public site lives here,
 * so edits do not require touching components.
 */

/**
 * Whether Supabase can actually send transactional email.
 *
 * Supabase's built-in SMTP is capped at a few messages per hour, which is not
 * enough for real password resets, so this stays false until a custom SMTP
 * provider is configured under Authentication → Emails. While false, the
 * "Lupa sandi" page asks people to contact the sekretariat instead of quietly
 * sending nothing. The reset code itself is already correct and needs no
 * changes — flip this to true once SMTP is live.
 */
export const EMAIL_ENABLED = false;

export const ORG = {
  short: "KPMI",
  full: "Komunitas Pengusaha Muslim Indonesia",
  tagline: "Bersama membangun ekosistem bisnis Islam yang kuat, halal, dan berkah.",
  description:
    "Komunitas Pengusaha Muslim Indonesia (KPMI) — wadah pengusaha Muslim untuk tumbuh bersama dalam bisnis yang halal, berkah, dan berdaya saing.",
  founded: 2010,
  email: "sekretariat@kpmi.or.id",
  phone: "+62 21 0000 0000",
  address: "Jakarta, Indonesia",
} as const;

/**
 * Rotating hero banners on the homepage.
 *
 * `image` is optional: while it is unset the slide falls back to `gradient`,
 * so the carousel looks finished before any photography exists. To use a real
 * photo, drop a wide JPG into `public/images/hero/` and set `image` to its
 * path — nothing else needs to change.
 */
export type HeroSlide = {
  badge: string;
  title: string;
  subtitle: string;
  image?: string;
  gradient: string;
  primary: { label: string; href: string };
  secondary: { label: string; href: string };
};

export const HERO_SLIDES: HeroSlide[] = [
  {
  badge: "Meeting dengan MUSIAD Turki",
  title: "Kolaborasi Bisnis Internasional",
  subtitle: "KPMI memperkuat jejaring dan peluang kolaborasi dengan komunitas pengusaha Muslim internasional untuk mendorong kemitraan, pertukaran wawasan, dan pertumbuhan usaha yang berkelanjutan.", 
  image: "/images/news/meet-up-musiad.png",
  gradient: "linear-gradient(135deg, #3d0000 0%, #6b0000 45%, #a51c2c 100%)",
  primary:   { label: "Gabung Sekarang",    href: "/daftar" },
  secondary: { label: "Jelajahi Direktori", href: "/bisnis" },
},
  {
    badge: "Sejak 2010 · Komunitas Pengusaha Muslim Indonesia",
    title: "Membangun Bisnis yang Halal & Berkah",
    subtitle:
      "Bersama membangun ekosistem bisnis Islam yang kuat, halal, dan berkah.",
    gradient: "linear-gradient(135deg, #3d0000 0%, #6b0000 45%, #a51c2c 100%)",
    primary: { label: "Gabung Sekarang", href: "/daftar" },
    secondary: { label: "Jelajahi Direktori", href: "/bisnis" },
  },
  {
    badge: "Pemberdayaan Ekonomi Syariah",
    title: "Ekosistem Pengusaha Muslim yang Amanah",
    subtitle:
      "Membangun ekosistem pengusaha Muslim yang amanah, profesional, dan berdaya saing global.",
    gradient: "linear-gradient(135deg, #2a0000 0%, #8b0000 55%, #c9a227 140%)",
    primary: { label: "Gabung Anggota", href: "/daftar" },
    secondary: { label: "Tentang KPMI", href: "/profil/tentang" },
  },
  {
    badge: "45 Koordinator Wilayah se-Indonesia",
    title: "Jaringan Pengusaha di Seluruh Nusantara",
    subtitle:
      "Terhubung dengan sesama pengusaha Muslim dari Sabang sampai Merauke.",
    gradient: "linear-gradient(135deg, #3d0000 0%, #5a0000 40%, #a98a1f 130%)",
    primary: { label: "Lihat Produk", href: "/produk" },
    secondary: { label: "Hubungi Kami", href: "/kontak" },
  },
];

export type NavItem = {
  label: string;
  href: string;
  children?: { label: string; href: string }[];
};

export const NAV: NavItem[] = [
  { label: "Beranda", href: "/" },
  {
    label: "Profil",
    href: "/profil",
    children: [
      { label: "Tentang KPMI", href: "/profil/tentang" },
      { label: "Visi & Misi", href: "/profil/visi-misi" },
      { label: "Struktur Organisasi", href: "/profil/struktur" },
    ],
  },
  { label: "Direktori Bisnis", href: "/bisnis" },
  { label: "Berita", href: "/berita" },
  { label: "Produk", href: "/produk" },
  { label: "Kontak", href: "/kontak" },
];

export const VISI =
  "Terbentuknya pengusaha Muslim yang berkualitas baik secara ekonomi maupun agamanya.";

export const MISI = [
  "Menyelenggarakan pembinaan dan edukasi fiqih muamalah bagi anggota.",
  "Membangun jaringan usaha yang kuat antar pengusaha Muslim.",
  "Mendorong pertumbuhan usaha anggota melalui program kemitraan.",
  "Memfasilitasi akses pembiayaan syariah dan permodalan.",
  "Menumbuhkan wirausaha baru yang berlandaskan nilai Islam.",
] as const;

export const NILAI = [
  "Bisnis dijalankan sesuai prinsip syariah",
  "Menjunjung tinggi etika dan amanah",
  "Saling mendukung antar sesama anggota",
  "Ilmu sebelum amal dalam bermuamalah",
  "Memberi manfaat bagi umat",
] as const;

export const MANFAAT = [
  {
    icon: "Users",
    title: "Jaringan Pengusaha",
    desc: "Terhubung dengan pengusaha Muslim dari 45 koordinator wilayah di dalam dan luar negeri.",
  },
  {
    icon: "BookOpen",
    title: "Literasi & Edukasi",
    desc: "Bimbingan muamalah syariah praktis serta pelatihan bisnis berkelanjutan.",
  },
  {
    icon: "Store",
    title: "Etalase Produk",
    desc: "Tampilkan produk dan layanan usaha Anda kepada sesama anggota dan publik.",
  },
  {
    icon: "Search",
    title: "Temukan Mitra",
    desc: "Cari pemasok, mitra, dan peluang kerja sama dari direktori bisnis anggota.",
  },
  {
    icon: "ShieldCheck",
    title: "Bisnis Halal",
    desc: "Pendampingan agar usaha berjalan sesuai prinsip syariah dan tetap berdaya saing.",
  },
  {
    icon: "TrendingUp",
    title: "Tumbuh Bersama",
    desc: "Program inkubasi dan kemitraan untuk mempercepat pertumbuhan usaha anggota.",
  },
] as const;
