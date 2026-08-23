import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
} from "react-router";
import type { Route } from "./+types/root";
import { ORG } from "@/content/site";
import stylesheet from "./globals.css?url";

/**
 * `next/font/google` self-hosted Outfit and handed back a class name. Vite has
 * no equivalent, so the font is linked from Google Fonts directly. `display=swap`
 * keeps text visible while it loads, matching the old `display: "swap"`.
 */
export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap",
  },
  { rel: "stylesheet", href: stylesheet },
];

/**
 * Next.js composed titles from a `template` in the root metadata. React Router
 * merges `meta` from every matched route instead: a child that exports `meta`
 * replaces these defaults, so each route spells out its own full title.
 */
export const meta: Route.MetaFunction = () => [
  { title: `${ORG.short} | ${ORG.full}` },
  { name: "description", content: ORG.description },
  {
    name: "keywords",
    content: [
      "KPMI", "Pengusaha Muslim", "Bisnis Halal",
      "Ekonomi Syariah", "Komunitas Bisnis", "Direktori Bisnis Muslim",
    ].join(", "),
  },
  { property: "og:type", content: "website" },
  { property: "og:locale", content: "id_ID" },
  { property: "og:title", content: `${ORG.short} | ${ORG.full}` },
  { property: "og:description", content: ORG.description },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="antialiased">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let title = "Terjadi kesalahan";
  let message = "Maaf, ada yang tidak beres. Silakan coba lagi.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    title = error.status === 404 ? "Halaman tidak ditemukan" : `${error.status}`;
    message =
      error.status === 404
        ? "Halaman yang Anda cari tidak ada atau sudah dipindahkan."
        : error.statusText || message;
  } else if (import.meta.env.DEV && error instanceof Error) {
    message = error.message;
    stack = error.stack;
  }

  return (
    <main className="grid min-h-screen place-items-center bg-white px-6">
      <div className="w-full max-w-lg text-center">
        <h1 className="font-display text-3xl font-extrabold text-maroon-900">
          {title}
        </h1>
        <div className="gold-rule mx-auto mt-5 w-24" />
        <p className="mt-5 text-gray-600">{message}</p>
        <a
          href="/"
          className="bg-maroon-bright mt-8 inline-flex items-center rounded-full px-6 py-2.5 text-sm font-bold text-white"
        >
          Kembali ke beranda
        </a>
        {stack && (
          <pre className="mt-8 overflow-x-auto rounded-lg bg-gray-50 p-4 text-left text-xs text-gray-700">
            <code>{stack}</code>
          </pre>
        )}
      </div>
    </main>
  );
}
