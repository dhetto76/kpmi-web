import { Eye, Target, CheckCircle2 } from "lucide-react";
import { PageHero, Card } from "@/components/ui";
import { VISI, MISI } from "@/content/site";

export const metadata = { title: "Visi & Misi" };

export default function VisionMissionPage() {
  return (
    <>
      <PageHero title="Visi & Misi" desc="Arah dan langkah perjuangan komunitas." />
      <section className="bg-white py-20">
        <div className="shell grid gap-8 lg:grid-cols-2">
          <Card className="card-lift h-full p-9">
            <div className="bg-maroon-deep mb-6 grid h-14 w-14 place-items-center rounded-xl text-gold-300">
              <Eye size={26} />
            </div>
            <h2 className="font-display text-2xl font-extrabold text-maroon-900">Visi</h2>
            <div className="gold-rule mt-4 w-16" />
            <p className="mt-5 leading-relaxed text-gray-600">{VISI}</p>
          </Card>

          <Card className="card-lift h-full p-9">
            <div className="bg-maroon-deep mb-6 grid h-14 w-14 place-items-center rounded-xl text-gold-300">
              <Target size={26} />
            </div>
            <h2 className="font-display text-2xl font-extrabold text-maroon-900">Misi</h2>
            <div className="gold-rule mt-4 w-16" />
            <ul className="mt-5 space-y-3">
              {MISI.map((m) => (
                <li key={m} className="flex gap-3 text-sm leading-relaxed text-gray-600">
                  <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-gold-500" />
                  {m}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </section>
    </>
  );
}
