import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BusinessForm } from "../business-form";

export const metadata = { title: "Daftarkan Usaha" };

export default function NewBusinessPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/bisnis"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-maroon-600"
        >
          <ArrowLeft size={15} /> Kembali
        </Link>
        <h1 className="mt-3 font-display text-2xl font-extrabold text-maroon-900">
          Daftarkan Usaha
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Hanya nama usaha yang wajib diisi. Sisanya bisa dilengkapi kapan saja.
        </p>
      </div>

      <BusinessForm />
    </div>
  );
}
