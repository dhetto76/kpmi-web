import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, Package, User, ArrowRight, Plus, Info } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, ButtonLink, StatusBadge, EmptyState } from "@/components/ui";

export const metadata = { title: "Ringkasan" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/masuk");

  const [{ data: profile }, { data: businesses }, { count: productCount }] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase
        .from("businesses")
        .select("id, name, slug, status, city, industry")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false }),
      supabase.from("products").select("*", { count: "exact", head: true }),
    ]);

  const ownedBusinesses = businesses ?? [];
  const profileIncomplete = !profile?.korwil || !profile?.phone;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-maroon-900">
          Assalamu&apos;alaikum, {profile?.full_name || "Anggota"}
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Kelola profil, usaha, dan produk Anda dari sini.
        </p>
      </div>

      {profile?.status === "pending" && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <Info size={20} className="mt-0.5 shrink-0 text-amber-600" />
          <div className="text-sm">
            <p className="font-bold text-amber-900">Keanggotaan menunggu verifikasi</p>
            <p className="mt-0.5 text-amber-800">
              Anda tetap bisa melengkapi profil dan mendaftarkan usaha. Profil akan
              tampil publik setelah disetujui pengurus.
            </p>
          </div>
        </div>
      )}

      {profileIncomplete && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-maroon-100 bg-maroon-50 p-4">
          <div className="text-sm">
            <p className="font-bold text-maroon-900">Lengkapi profil Anda</p>
            <p className="mt-0.5 text-maroon-800">
              Tambahkan korwil dan nomor kontak agar anggota lain dapat menghubungi Anda.
            </p>
          </div>
          <ButtonLink href="/dashboard/profil" size="sm">
            Lengkapi <ArrowRight size={15} />
          </ButtonLink>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { icon: User, label: "Status Anggota", value: profile?.status ?? "-", isStatus: true },
          { icon: Building2, label: "Usaha Terdaftar", value: String(ownedBusinesses.length) },
          { icon: Package, label: "Produk & Jasa", value: String(productCount ?? 0) },
        ].map((s) => (
          <Card key={s.label} className="p-5">
            <div className="flex items-center gap-2 text-gray-500">
              <s.icon size={16} />
              <span className="text-xs font-bold uppercase tracking-wide">{s.label}</span>
            </div>
            <div className="mt-2">
              {s.isStatus ? (
                <StatusBadge status={String(s.value)} />
              ) : (
                <span className="font-display text-2xl font-extrabold tabular-nums text-maroon-900">
                  {s.value}
                </span>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="font-display text-lg font-bold text-maroon-900">Usaha Saya</h2>
          <ButtonLink href="/dashboard/bisnis/baru" size="sm" variant="outline">
            <Plus size={15} /> Tambah
          </ButtonLink>
        </div>

        {ownedBusinesses.length === 0 ? (
          <EmptyState
            title="Belum ada usaha terdaftar"
            desc="Daftarkan usaha Anda agar tampil di direktori bisnis KPMI."
            action={
              <ButtonLink href="/dashboard/bisnis/baru">
                <Plus size={16} /> Daftarkan Usaha
              </ButtonLink>
            }
          />
        ) : (
          <ul className="divide-y divide-gray-100">
            {ownedBusinesses.map((b) => (
              <li key={b.id}>
                <Link
                  href={`/dashboard/bisnis/${b.id}`}
                  className="flex items-center justify-between gap-4 py-3.5 transition-colors hover:bg-gray-50"
                >
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-gray-900">{b.name}</div>
                    <div className="mt-0.5 truncate text-xs text-gray-500">
                      {[b.industry, b.city].filter(Boolean).join(" · ") || "Belum dilengkapi"}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <StatusBadge status={b.status} />
                    <ArrowRight size={16} className="text-gray-400" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
