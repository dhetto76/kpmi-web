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
] satisfies RouteConfig;
