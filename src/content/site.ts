/**
 * Static site content: organization details, navigation, and page copy.
 *
 * Everything a non-developer might want changed on the public site lives here,
 * so edits do not require touching components.
 */

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
