import { CheckCircle2 } from "lucide-react";
import { PageHero } from "@/components/ui";
import { ORG, NILAI } from "@/content/site";

export const metadata = { title: "Tentang KPMI" };

export default function AboutPage() {
  return (
    <>
      <PageHero
        title="Tentang KPMI"
        desc="Mengenal lebih dekat Komunitas Pengusaha Muslim Indonesia."
      />
      <section className="bg-white py-20">
        <div className="shell grid gap-12 lg:grid-cols-2">
          <div>
            <h2 className="font-display text-2xl font-extrabold text-maroon-900">
              Sejarah Singkat
            </h2>
            <div className="gold-rule mt-4 w-20" />
            <div className="mt-6 space-y-4 leading-relaxed text-gray-600">
              <p>
                {ORG.full} ({ORG.short}) berdiri pada tahun {ORG.founded}, tumbuh dari
                inisiatif digital berupa situs web dan milis yang mempertemukan para
                pengusaha Muslim di Indonesia.
              </p>
              <p>
                Komunitas ini hadir sebagai wadah bagi pelaku usaha untuk saling
                menguatkan, berbagi ilmu, dan mengembangkan bisnis yang selaras dengan
                prinsip syariah, khususnya fiqih muamalah.
              </p>
              <p>
                Kini KPMI menaungi anggota yang tersebar di puluhan koordinator wilayah,
                di dalam maupun luar negeri.
              </p>
            </div>
          </div>

          <div className="bg-maroon-deep pattern-geo rounded-3xl p-9 text-white">
            <h2 className="font-display text-xl font-bold text-gold-300">
              Nilai yang Kami Pegang
            </h2>
            <ul className="mt-6 space-y-4">
              {NILAI.map((v) => (
                <li key={v} className="flex gap-3 text-sm text-white/85">
                  <CheckCircle2 size={19} className="mt-0.5 shrink-0 text-gold-300" />
                  {v}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
