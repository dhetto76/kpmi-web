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
] satisfies RouteConfig;
