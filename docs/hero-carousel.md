# Editing the homepage carousel

Everything lives in one place: `HERO_SLIDES` in `src/content/site.ts`.
Each `{ ... }` block is one slide.

```ts
{
  badge: "Sejak 2010 · Komunitas Pengusaha Muslim Indonesia",
  title: "Membangun Bisnis yang Halal & Berkah",
  subtitle: "Bersama membangun ekosistem bisnis Islam yang kuat, halal, dan berkah.",
  image: "/images/hero/jakarta.jpg",
  gradient: "linear-gradient(135deg, #3d0000 0%, #6b0000 45%, #a51c2c 100%)",
  primary:   { label: "Gabung Sekarang",    href: "/daftar" },
  secondary: { label: "Jelajahi Direktori", href: "/bisnis" },
},
```

---

### 1. Title & subtitle

Edit the text in place.

```ts
title: "Pemberdayaan Ekonomi Syariah",
subtitle: "Membangun ekosistem pengusaha Muslim yang amanah dan profesional.",
badge: "KPMI Jakarta Official Banner",
```

Keep the title to two lines and the subtitle to one sentence.

### 2. Image

Put the file in `public/images/hero/`, then point `image` at it — starting with
`/images/`, not `public/`.

```ts
image: "/images/hero/jakarta.jpg",
```

Leave `image` out entirely to use the `gradient` instead. Use wide, darker
photos (2400px+, under 400 KB); white text sits on top.

### 3. Links

`label` is the button text, `href` is where it goes.

```ts
primary:   { label: "Gabung Anggota", href: "/daftar" },
secondary: { label: "Tentang KPMI",   href: "/profil/tentang" },
```

Valid paths: `/` `/bisnis` `/produk` `/berita` `/kontak` `/daftar` `/masuk`
`/profil/tentang` `/profil/visi-misi` `/profil/struktur`

### 4. Add or remove a slide

Copy a whole `{ ... }` block and edit it, or delete one. Order in the array is
the order shown, and the dots update themselves. Keep 3–5 slides.

---

Check with `npm run dev`, then `npm run build` before deploying. A `Type error`
there means a slide is missing a field — the message names the line.
