import Link from "next/link";
import { Users, Building2, Package, Clock, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui";

export default async function AdminOverviewPage() {
  const supabase = await createClient();

  const [members, pendingMembers, businesses, pendingBusinesses, products] =
    await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("profiles").select("*", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase.from("businesses").select("*", { count: "exact", head: true }),
      supabase.from("businesses").select("*", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase.from("products").select("*", { count: "exact", head: true }),
    ]);

  const queues = [
    {
      label: "Anggota menunggu verifikasi",
      count: pendingMembers.count ?? 0,
      href: "/admin/anggota?status=pending",
    },
    {
      label: "Usaha menunggu verifikasi",
      count: pendingBusinesses.count ?? 0,
      href: "/admin/bisnis?status=pending",
    },
  ];

  const stats = [
    { icon: Users, label: "Total Anggota", value: members.count ?? 0 },
    { icon: Building2, label: "Total Usaha", value: businesses.count ?? 0 },
    { icon: Package, label: "Total Produk", value: products.count ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-maroon-900">
          Ringkasan
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Antrean verifikasi dan statistik platform.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {queues.map((q) => (
          <Link key={q.href} href={q.href} className="card-lift block">
            <Card
              className={
                q.count > 0
                  ? "border-amber-200 bg-amber-50 p-5"
                  : "p-5"
              }
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock size={16} />
                  <span className="text-xs font-bold uppercase tracking-wide">
                    Antrean
                  </span>
                </div>
                <ArrowRight size={15} className="text-gray-400" />
              </div>
              <div className="mt-2 font-display text-3xl font-extrabold tabular-nums text-maroon-900">
                {q.count}
              </div>
              <div className="mt-0.5 text-sm text-gray-600">{q.label}</div>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label} className="p-5">
            <div className="flex items-center gap-2 text-gray-500">
              <s.icon size={16} />
              <span className="text-xs font-bold uppercase tracking-wide">{s.label}</span>
            </div>
            <div className="mt-2 font-display text-2xl font-extrabold tabular-nums text-maroon-900">
              {s.value}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
