import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import { ORG } from "@/content/site";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${ORG.short} | ${ORG.full}`,
    template: `%s | ${ORG.short}`,
  },
  description: ORG.description,
  keywords: [
    "KPMI", "Pengusaha Muslim", "Bisnis Halal",
    "Ekonomi Syariah", "Komunitas Bisnis", "Direktori Bisnis Muslim",
  ],
  openGraph: {
    type: "website",
    locale: "id_ID",
    title: `${ORG.short} | ${ORG.full}`,
    description: ORG.description,
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className={outfit.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
