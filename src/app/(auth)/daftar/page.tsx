import Link from "next/link";
import { Lock } from "lucide-react";
import { Card } from "@/components/ui";
import { getSiteSettings, isEnabled } from "@/lib/settings";
import { SignUpForm } from "./signup-form";

export const metadata = { title: "Daftar Anggota" };

/**
 * Registration, gated by the `registration_open` setting.
 *
 * The signUp action enforces the same rule — this only avoids presenting a
 * form that is guaranteed to be refused.
 */
export default async function SignUpPage() {
  const settings = await getSiteSettings();

  if (!isEnabled(settings.registration_open)) {
    return (
      <Card className="p-8 text-center">
        <div className="bg-maroon-deep mx-auto grid h-14 w-14 place-items-center rounded-xl text-gold-300">
          <Lock size={24} />
        </div>
        <h1 className="mt-5 font-display text-2xl font-extrabold text-maroon-900">
          Pendaftaran Ditutup
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm text-gray-600">
          Pendaftaran anggota baru sedang ditutup sementara. Silakan hubungi
          sekretariat KPMI di{" "}
          <a
            href={`mailto:${settings.org_email}`}
            className="font-semibold text-maroon-600 hover:underline"
          >
            {settings.org_email}
          </a>{" "}
          untuk informasi lebih lanjut.
        </p>
        <p className="mt-6 text-sm text-gray-600">
          Sudah punya akun?{" "}
          <Link href="/masuk" className="font-bold text-maroon-600 hover:underline">
            Masuk di sini
          </Link>
        </p>
      </Card>
    );
  }

  return <SignUpForm />;
}
