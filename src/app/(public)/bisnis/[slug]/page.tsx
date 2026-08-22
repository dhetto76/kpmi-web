import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  Building2, MapPin, Phone, Mail, Globe, MessageCircle,
  Calendar, Users, ArrowLeft,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, Badge } from "@/components/ui";
import { formatPrice } from "@/lib/utils";
import { BusinessIcon, ProductIcon } from "@/lib/category-icons";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("businesses")
    .select("name, description")
    .eq("slug", slug)
    .eq("status", "approved")
    .maybeSingle();

  if (!data) return { title: "Usaha tidak ditemukan" };
  return { title: data.name, description: data.description ?? undefined };
}

export default async function BusinessDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("slug", slug)
    .eq("status", "approved")
    .maybeSingle();

  if (!business) notFound();

  const { data: products } = await supabase
    .from("products")
    .select("id, name, slug, description, price, price_unit, category, images")
    .eq("business_id", business.id)
    .eq("is_published", true)
    .order("name");

  const waNumber = business.whatsapp?.replace(/\D/g, "");

  const contacts = [
    business.phone && {
      icon: Phone,
      label: business.phone,
      href: `tel:${business.phone}`,
    },
    waNumber && {
      icon: MessageCircle,
      label: business.whatsapp!,
      href: `https://wa.me/${waNumber}`,
    },
    business.email && {
      icon: Mail,
      label: business.email,
      href: `mailto:${business.email}`,
    },
    business.website && {
      icon: Globe,
      label: business.website,
      href: business.website,
    },
  ].filter(Boolean) as { icon: typeof Phone; label: string; href: string }[];

  const facts = [
    business.legal_form && {
      icon: Building2,
      label: "Badan Usaha",
      value: business.legal_form,
    },
    business.founded_year && {
      icon: Calendar,
      label: "Berdiri",
      value: String(business.founded_year),
    },
    business.employee_count && {
      icon: Users,
      label: "Karyawan",
      value: business.employee_count,
    },
    business.market && { icon: Globe, label: "Pasar", value: business.market },
  ].filter(Boolean) as { icon: typeof Phone; label: string; value: string }[];

  return (
    <>
      <section className="bg-maroon-deep pattern-geo pb-14 pt-32">
        <div className="shell">
          <Link
            href="/bisnis"
            className="inline-flex items-center gap-1.5 text-sm text-white/70 transition-colors hover:text-gold-300"
          >
            <ArrowLeft size={15} /> Direktori Bisnis
          </Link>

          <div className="mt-5 flex flex-wrap items-start gap-5">
            {business.logo_url ? (
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-white shadow-lg">
                <Image
                  src={business.logo_url}
                  alt={business.name}
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="bg-gold-grad grid h-20 w-20 shrink-0 place-items-center rounded-2xl text-maroon-900 shadow-lg">
                <BusinessIcon industry={business.industry} size={34} strokeWidth={1.75} />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-3xl font-extrabold tracking-tight text-balance text-white sm:text-4xl">
                {business.name}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-2.5 text-sm text-white/75">
                {business.industry && (
                  <span className="rounded-full bg-white/10 px-3 py-1 font-medium text-gold-300">
                    {business.industry}
                  </span>
                )}
                {business.city && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin size={14} /> {business.city}
                  </span>
                )}
                {business.business_role && <span>· {business.business_role}</span>}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-14">
        <div className="shell grid gap-8 lg:grid-cols-[1fr_20rem]">
          <div className="min-w-0 space-y-8">
            {business.description && (
              <div>
                <h2 className="font-display text-xl font-bold text-maroon-900">
                  Tentang Usaha
                </h2>
                <div className="gold-rule mt-3 w-14" />
                <p className="mt-4 whitespace-pre-line leading-relaxed text-gray-700">
                  {business.description}
                </p>
              </div>
            )}

            <div>
              <h2 className="font-display text-xl font-bold text-maroon-900">
                Produk &amp; Jasa
              </h2>
              <div className="gold-rule mt-3 w-14" />

              {!products || products.length === 0 ? (
                <p className="mt-4 text-sm text-gray-500">
                  Usaha ini belum menampilkan produk.
                </p>
              ) : (
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  {products.map((p) => (
                    <Card key={p.id} className="card-lift overflow-hidden">
                      {p.images?.[0] ? (
                        <div className="relative h-36 w-full">
                          <Image
                            src={p.images[0]}
                            alt=""
                            fill
                            sizes="(max-width: 768px) 100vw, 350px"
                            className="object-cover"
                          />
                        </div>
                      ) : null}
                      <div className="p-5">
                      {!p.images?.[0] && (
                        <div className="bg-maroon-deep mb-3 grid h-10 w-10 place-items-center rounded-lg text-gold-300">
                          <ProductIcon category={p.category} size={18} />
                        </div>
                      )}
                      <h3 className="font-display font-bold text-maroon-900">{p.name}</h3>
                      {p.description && (
                        <p className="mt-1.5 line-clamp-2 text-sm text-gray-600">
                          {p.description}
                        </p>
                      )}
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <span className="font-semibold text-maroon-600">
                          {formatPrice(p.price, p.price_unit)}
                        </span>
                        {p.category && <Badge tone="neutral">{p.category}</Badge>}
                      </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>

          <aside className="space-y-5">
            {contacts.length > 0 && (
              <Card className="p-5">
                <h2 className="font-display font-bold text-maroon-900">Kontak</h2>
                <ul className="mt-4 space-y-3">
                  {contacts.map((c) => (
                    <li key={c.href}>
                      <a
                        href={c.href}
                        target={c.href.startsWith("http") ? "_blank" : undefined}
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 text-sm text-gray-700 transition-colors hover:text-maroon-600"
                      >
                        <c.icon size={16} className="shrink-0 text-gold-500" />
                        <span className="truncate">{c.label}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {business.address && (
              <Card className="p-5">
                <h2 className="font-display font-bold text-maroon-900">Alamat</h2>
                <p className="mt-3 flex gap-3 text-sm text-gray-700">
                  <MapPin size={16} className="mt-0.5 shrink-0 text-gold-500" />
                  <span className="whitespace-pre-line">{business.address}</span>
                </p>
              </Card>
            )}

            {facts.length > 0 && (
              <Card className="p-5">
                <h2 className="font-display font-bold text-maroon-900">Profil Singkat</h2>
                <dl className="mt-4 space-y-3">
                  {facts.map((f) => (
                    <div
                      key={f.label}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <dt className="flex items-center gap-2 text-gray-500">
                        <f.icon size={15} /> {f.label}
                      </dt>
                      <dd className="font-medium text-gray-900">{f.value}</dd>
                    </div>
                  ))}
                </dl>
              </Card>
            )}
          </aside>
        </div>
      </section>
    </>
  );
}
