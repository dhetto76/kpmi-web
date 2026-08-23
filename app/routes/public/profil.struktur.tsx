import type { Route } from "./+types/profil.struktur";
import { PageHero, Card } from "@/components/ui";

export const meta: Route.MetaFunction = () => [{ title: "Struktur Organisasi | KPMI" }];

const ROLES = [
  "Ketua Umum", "Wakil Ketua", "Sekretaris Jenderal", "Bendahara",
  "Bidang Keanggotaan", "Bidang Program", "Bidang Kemitraan", "Bidang Media",
];

export default function StructurePage() {
  return (
    <>
      <PageHero
        title="Struktur Organisasi"
        desc="Pengurus KPMI berdasarkan bidang keahlian."
      />
      <section className="bg-white py-20">
        <div className="shell grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {ROLES.map((r) => (
            <Card key={r} className="card-lift p-6 text-center">
              <div className="bg-gold-grad mx-auto grid h-20 w-20 place-items-center rounded-full font-display text-2xl font-extrabold text-maroon-900">
                {r.charAt(0)}
              </div>
              <h2 className="mt-5 font-display font-bold text-maroon-900">{r}</h2>
              <p className="mt-1 text-xs text-gray-500">Pengurus KPMI</p>
            </Card>
          ))}
        </div>
      </section>
    </>
  );
}
