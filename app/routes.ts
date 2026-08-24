import {
  type RouteConfig,
  index,
  layout,
  prefix,
  route,
} from "@react-router/dev/routes";

/**
 * The route tree, declared explicitly.
 *
 * Next.js derived this from directory names: `(public)` was a route group that
 * grouped files under a shared layout without adding a URL segment. Here
 * `layout()` does the grouping and `prefix()` adds URL segments, so the two
 * concerns Next.js folded into folder naming are separate and visible.
 */
export default [
  layout("routes/public/layout.tsx", [
    index("routes/public/home.tsx"),

    route("bisnis", "routes/public/bisnis._index.tsx"),
    route("bisnis/:slug", "routes/public/bisnis.$slug.tsx"),

    route("produk", "routes/public/produk._index.tsx"),

    route("berita", "routes/public/berita._index.tsx"),
    route("berita/:slug", "routes/public/berita.$slug.tsx"),

    route("kontak", "routes/public/kontak.tsx"),

    ...prefix("profil", [
      route("tentang", "routes/public/profil.tentang.tsx"),
      route("visi-misi", "routes/public/profil.visi-misi.tsx"),
      route("struktur", "routes/public/profil.struktur.tsx"),
    ]),
  ]),

  layout("routes/auth/layout.tsx", [
    route("masuk", "routes/auth/masuk.tsx"),
    route("daftar", "routes/auth/daftar.tsx"),
    route("lupa-sandi", "routes/auth/lupa-sandi.tsx"),
    route("keluar", "routes/auth/keluar.tsx"),
  ]),

  // Not under the auth layout: it renders nothing, only redirects.
  route("auth/callback", "routes/auth/callback.ts"),

  layout("routes/member/layout.tsx", [
    ...prefix("dashboard", [
      index("routes/member/dashboard._index.tsx"),
      route("profil", "routes/member/profil.tsx"),

      route("bisnis", "routes/member/bisnis._index.tsx"),
      route("bisnis/baru", "routes/member/bisnis.baru.tsx"),
      route("bisnis/:id", "routes/member/bisnis.$id.tsx"),

      route("produk", "routes/member/produk._index.tsx"),
      route("produk/baru", "routes/member/produk.baru.tsx"),
      route("produk/:id", "routes/member/produk.$id.tsx"),
    ]),
  ]),

  layout("routes/admin/layout.tsx", [
    ...prefix("admin", [
      index("routes/admin/admin._index.tsx"),
      route("anggota", "routes/admin/anggota.tsx"),
      route("anggota/:id", "routes/admin/anggota.$id.tsx"),

      route("bisnis", "routes/admin/bisnis._index.tsx"),
      route("bisnis/:id", "routes/admin/bisnis.$id.tsx"),

      route("produk", "routes/admin/produk._index.tsx"),
      route("produk/:id", "routes/admin/produk.$id.tsx"),

      // The three reference lists are the same page over a different `kind`.
      route("korwil", "routes/admin/korwil.tsx"),
      route("kategori", "routes/admin/kategori.tsx"),
      route("industri", "routes/admin/industri.tsx"),

      route("carousel", "routes/admin/carousel.tsx"),
      route("pengguna", "routes/admin/pengguna.tsx"),
      route("pengaturan", "routes/admin/pengaturan.tsx"),
    ]),
  ]),
] satisfies RouteConfig;
