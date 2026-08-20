import { Mail, Phone, MapPin } from "lucide-react";
import { PageHero, Card } from "@/components/ui";
import { ORG } from "@/content/site";

export const metadata = { title: "Kontak" };

export default function ContactPage() {
  const items = [
    { icon: MapPin, label: "Alamat", value: ORG.address, href: null },
    { icon: Mail, label: "Email", value: ORG.email, href: `mailto:${ORG.email}` },
    { icon: Phone, label: "Telepon", value: ORG.phone, href: `tel:${ORG.phone}` },
  ];

  return (
    <>
      <PageHero title="Kontak" desc="Hubungi kami untuk pertanyaan dan kerja sama." />
      <section className="bg-white py-20">
        <div className="shell grid gap-6 md:grid-cols-3">
          {items.map((it) => (
            <Card key={it.label} className="card-lift h-full p-8 text-center">
              <div className="bg-maroon-deep mx-auto grid h-14 w-14 place-items-center rounded-xl text-gold-300">
                <it.icon size={24} />
              </div>
              <h2 className="mt-5 font-display font-bold text-maroon-900">{it.label}</h2>
              {it.href ? (
                <a
                  href={it.href}
                  className="mt-2 block text-sm text-gray-600 hover:text-maroon-600"
                >
                  {it.value}
                </a>
              ) : (
                <p className="mt-2 text-sm text-gray-600">{it.value}</p>
              )}
            </Card>
          ))}
        </div>
      </section>
    </>
  );
}
