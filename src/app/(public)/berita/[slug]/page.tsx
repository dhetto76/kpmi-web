import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Calendar, MapPin, ArrowLeft, ExternalLink } from "lucide-react";
import { getAllNews, getNewsBySlug, renderBody } from "@/lib/news";
import { Badge, ButtonLink } from "@/components/ui";
import { formatDate } from "@/lib/utils";

/** Pre-render every article at build time. */
export function generateStaticParams() {
  return getAllNews().map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const item = getNewsBySlug(slug);
  if (!item) return { title: "Tidak ditemukan" };

  return {
    title: item.title,
    description: item.excerpt,
    openGraph: {
      title: item.title,
      description: item.excerpt,
      images: item.image ? [item.image] : undefined,
    },
  };
}

export default async function NewsDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const item = getNewsBySlug(slug);
  if (!item) notFound();

  const html = await renderBody(item.body);

  return (
    <>
      <section className="bg-maroon-deep pattern-geo pb-12 pt-32">
        <div className="shell max-w-3xl">
          <Link
            href="/berita"
            className="inline-flex items-center gap-1.5 text-sm text-white/70 transition-colors hover:text-gold-300"
          >
            <ArrowLeft size={15} /> Berita &amp; Acara
          </Link>

          <div className="mt-5 flex flex-wrap items-center gap-2.5 text-xs">
            <Badge tone="gold">{item.type === "acara" ? "Acara" : "Berita"}</Badge>
            <span className="text-white/60">{formatDate(item.date)}</span>
          </div>

          <h1 className="mt-4 font-display text-3xl font-extrabold leading-tight tracking-tight text-balance text-white sm:text-4xl">
            {item.title}
          </h1>

          {(item.eventDate || item.location) && (
            <div className="mt-5 flex flex-wrap gap-5 text-sm text-white/75">
              {item.eventDate && (
                <span className="inline-flex items-center gap-2">
                  <Calendar size={15} className="text-gold-300" />
                  {formatDate(item.eventDate)}
                </span>
              )}
              {item.location && (
                <span className="inline-flex items-center gap-2">
                  <MapPin size={15} className="text-gold-300" />
                  {item.location}
                </span>
              )}
            </div>
          )}
        </div>
      </section>

      <article className="bg-white py-14">
        <div className="shell max-w-3xl">
          {item.image && (
            <div className="relative mb-10 aspect-[16/9] overflow-hidden rounded-2xl">
              <Image
                src={item.image}
                alt=""
                fill
                sizes="(max-width: 768px) 100vw, 768px"
                className="object-cover"
                priority
              />
            </div>
          )}

          <p className="text-lg leading-relaxed text-gray-700">{item.excerpt}</p>
          <div className="gold-rule my-8 w-20" />

          {/*
            Body HTML comes from Markdown files in this repository, authored by
            maintainers — not from user input, so this is not an XSS vector.
          */}
          <div
            className="prose-kpmi"
            dangerouslySetInnerHTML={{ __html: html }}
          />

          {item.link && (
            <div className="mt-10">
              <ButtonLink href={item.link} target="_blank" rel="noopener noreferrer" size="lg">
                Selengkapnya <ExternalLink size={16} />
              </ButtonLink>
            </div>
          )}

          {item.gallery.length > 0 && (
            <div className="mt-12">
              <h2 className="font-display text-xl font-bold text-maroon-900">Galeri</h2>
              <div className="gold-rule mt-3 w-14" />
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {item.gallery.map((src) => (
                  <div
                    key={src}
                    className="relative aspect-[4/3] overflow-hidden rounded-xl"
                  >
                    <Image
                      src={src}
                      alt=""
                      fill
                      sizes="(max-width: 768px) 100vw, 400px"
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-14 border-t border-gray-100 pt-8">
            <Link
              href="/berita"
              className="inline-flex items-center gap-1.5 font-bold text-maroon-600 hover:underline"
            >
              <ArrowLeft size={16} /> Kembali ke daftar berita
            </Link>
          </div>
        </div>
      </article>
    </>
  );
}
