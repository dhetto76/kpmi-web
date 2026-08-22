import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, ButtonLink, StatusBadge, EmptyState } from "@/components/ui";
import { BusinessIcon } from "@/lib/category-icons";

export const metadata = { title: "Usaha Saya" };

export default async function BusinessListPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/masuk");

  const { data: businesses } = await supabase
    .from("businesses")
    .select("id, name, status, city, industry, description")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  const list = businesses ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-maroon-900">
            Usaha Saya
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Usaha yang disetujui akan tampil di direktori publik.
          </p>
        </div>
        <ButtonLink href="/dashboard/bisnis/baru">
          <Plus size={16} /> Tambah Usaha
        </ButtonLink>
      </div>

      {list.length === 0 ? (
        <EmptyState
          title="Belum ada usaha terdaftar"
          desc="Daftarkan usaha Anda agar dapat menampilkan produk dan ditemukan anggota lain."
          action={
            <ButtonLink href="/dashboard/bisnis/baru">
              <Plus size={16} /> Daftarkan Usaha
            </ButtonLink>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {list.map((b) => (
            <Link key={b.id} href={`/dashboard/bisnis/${b.id}`} className="card-lift block">
              <Card className="h-full p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="bg-maroon-deep grid h-11 w-11 shrink-0 place-items-center rounded-xl text-gold-300">
                    <BusinessIcon industry={b.industry} size={20} />
                  </div>
                  <StatusBadge status={b.status} />
                </div>
                <h2 className="mt-4 font-display font-bold text-maroon-900">{b.name}</h2>
                <p className="mt-1 line-clamp-2 text-sm text-gray-600">
                  {b.description || "Belum ada deskripsi."}
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    {[b.industry, b.city].filter(Boolean).join(" · ") || "—"}
                  </span>
                  <ArrowRight size={15} className="text-gray-400" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
