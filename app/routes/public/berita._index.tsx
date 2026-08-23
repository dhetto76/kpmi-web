import { Link } from "react-router";
import { Calendar, MapPin, Newspaper, ArrowRight } from "lucide-react";
import type { Route } from "./+types/berita._index";
import { getAllNews } from "@/lib/news.server";
import { PageHero, Card, Badge, EmptyState } from "@/components/ui";
import { Image } from "@/components/ui/image";
import { formatDate } from "@/lib/utils";

export const meta: Route.MetaFunction = () => [
  { title: "Berita & Acara | KPMI" },
  {
    name: "description",
    content:
      "Kabar terbaru dan agenda kegiatan Komunitas Pengusaha Muslim Indonesia.",
  },
];

/**
 * Reads Markdown files off disk. This was a synchronous Server Component in
 * Next.js; a loader is the equivalent seam, and keeps `fs` off the client.
 */
export function loader() {
  return { items: getAllNews() };
}

export default function NewsIndexPage({ loaderData }: Route.ComponentProps) {
  const { items } = loaderData;

  return (
    <>
      <PageHero
        title="Berita & Acara"
        desc="Kabar terbaru dan agenda kegiatan komunitas."
      />

      <section className="bg-white py-14">
        <div className="shell">
          {items.length === 0 ? (
            <EmptyState
              title="Belum ada berita"
              desc="Kabar dan agenda kegiatan akan tampil di sini."
            />
          ) : (
            <div className="grid gap-7 md:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <Link key={item.slug} to={`/berita/${item.slug}`} className="card-lift block">
                  <Card className="flex h-full flex-col overflow-hidden">
                    <div className="bg-maroon-deep pattern-geo relative grid h-44 place-items-center overflow-hidden">
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt=""
                          fill
                          sizes="(max-width: 768px) 100vw, 350px"
                          className="object-cover"
                        />
                      ) : (
                        <Newspaper size={34} className="text-white/25" />
                      )}
                      {item.draft && (
                        <span className="absolute left-3 top-3 rounded bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-amber-950">
                          DRAF
                        </span>
                      )}
                    </div>

                    <div className="flex flex-1 flex-col p-6">
                      <div className="mb-3 flex flex-wrap items-center gap-2.5 text-xs">
                        <Badge tone={item.type === "acara" ? "gold" : "maroon"}>
                          {item.type === "acara" ? "Acara" : "Berita"}
                        </Badge>
                        <span className="text-gray-400">{formatDate(item.date)}</span>
                      </div>

                      <h2 className="font-display text-lg font-bold leading-snug text-maroon-900">
                        {item.title}
                      </h2>
                      <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-gray-600">
                        {item.excerpt}
                      </p>

                      <div className="mt-4 space-y-1.5 text-xs text-gray-500">
                        {item.eventDate && (
                          <div className="flex items-center gap-1.5">
                            <Calendar size={13} className="text-gold-500" />
                            {formatDate(item.eventDate)}
                          </div>
                        )}
                        {item.location && (
                          <div className="flex items-center gap-1.5">
                            <MapPin size={13} className="text-gold-500" />
                            {item.location}
                          </div>
                        )}
                      </div>

                      <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-gold-600">
                        Baca selengkapnya <ArrowRight size={14} />
                      </span>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
