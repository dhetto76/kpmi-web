import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  ChevronDown,
  Filter,
  MapPin,
  Package,
  UserPlus,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireAdminContext } from "@/lib/auth";
import { KORWIL } from "@/lib/reference-data";

const format = new Intl.NumberFormat("id-ID");

type ListItem = { label: string; value: number };
type DonutItem = ListItem & { color: string };

const CARD = "rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_4px_rgba(15,23,42,0.04)]";

function distribute(total: number, weights: number[]) {
  if (total === 0) return weights.map(() => 0);
  const weightTotal = weights.reduce((sum, value) => sum + value, 0);
  const values = weights.map((weight) => Math.floor((total * weight) / weightTotal));
  values[0] += total - values.reduce((sum, value) => sum + value, 0);
  return values;
}

function MiniBarList({ items, color }: { items: ListItem[]; color: string }) {
  const max = Math.max(...items.map((item) => item.value), 1);
  return (
    <div className="space-y-2.5">
      {items.map((item) => (
        <div key={item.label} className="grid grid-cols-[minmax(76px,1fr)_minmax(54px,1.15fr)_34px] items-center gap-2 text-[10px]">
          <span className="font-medium leading-tight text-slate-700">{item.label}</span>
          <span className="h-1 rounded-full bg-slate-100">
            <span className="block h-full rounded-full" style={{ width: `${(item.value / max) * 100}%`, backgroundColor: color }} />
          </span>
          <span className="text-right font-semibold tabular-nums text-slate-700">{format.format(item.value)}</span>
        </div>
      ))}
    </div>
  );
}

function MetricCard({
  icon: Icon,
  title,
  subtitle,
  total,
  totalLabel,
  change,
  accent,
  iconClass,
  items,
  listTitle,
  href,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  total: number;
  totalLabel: string;
  change: string;
  accent: string;
  iconClass: string;
  items: ListItem[];
  listTitle: string;
  href: string;
}) {
  return (
    <section className={`${CARD} min-w-0 p-4`}>
      <div className="grid min-h-[190px] grid-cols-1 gap-4 sm:grid-cols-[minmax(132px,.82fr)_minmax(170px,1.18fr)]">
        <div className="flex min-w-0 flex-col border-slate-100 sm:border-r sm:pr-4">
          <div className="flex items-center gap-3">
            <span className={`grid size-10 shrink-0 place-items-center rounded-full ${iconClass}`}><Icon size={21} /></span>
            <div className="min-w-0">
              <h2 className="truncate text-sm font-extrabold text-slate-900">{title}</h2>
              <p className="mt-0.5 truncate text-[10px] text-slate-500">{subtitle}</p>
            </div>
          </div>
          <div className="mt-5 text-[30px] font-extrabold leading-none tracking-[-0.035em] tabular-nums text-slate-800">{format.format(total)}</div>
          <p className="mt-2 text-xs text-slate-500">{totalLabel}</p>
          <div className="mt-auto flex items-center gap-2 pt-4 text-[10px] text-slate-500">
            <span className="rounded-full bg-emerald-50 px-2 py-1 font-extrabold text-emerald-700">{change}</span>
            <span>vs bulan lalu</span>
          </div>
        </div>
        <div className="flex min-w-0 flex-col">
          <h3 className="mb-3 text-[10px] font-extrabold text-slate-700">{listTitle}</h3>
          <MiniBarList items={items} color={accent} />
          <Link href={href} className="mt-auto flex items-center justify-end gap-2 pt-3 text-[10px] font-semibold text-slate-700 hover:text-maroon-600">
            Lihat detail <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    </section>
  );
}

function PanelHeading({ title, subtitle, action }: { title: string; subtitle: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h2 className="text-sm font-extrabold text-slate-900">{title}</h2>
        <p className="mt-1 text-[10px] text-slate-500">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

function BarChart({ items }: { items: ListItem[] }) {
  const max = Math.max(...items.map((item) => item.value), 1);
  return (
    <div className="mt-4 grid h-[148px] grid-cols-7 items-end gap-2 border-b border-slate-200 bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_48px,#f1f5f9_49px)] px-2">
      {items.map((item) => (
        <div key={item.label} className="flex h-full min-w-0 flex-col justify-end text-center">
          <span className="mb-1 text-[9px] font-semibold tabular-nums text-slate-700">{item.value}</span>
          <span className="mx-auto w-[68%] max-w-7 rounded-t-[3px] bg-[linear-gradient(180deg,#cf3232,#b91620)]" style={{ height: `${Math.max(12, (item.value / max) * 104)}px` }} />
          <span className="mt-2 truncate text-[8px] text-slate-600">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

function Donut({ items, size = 142 }: { items: DonutItem[]; size?: number }) {
  const total = Math.max(items.reduce((sum, item) => sum + item.value, 0), 1);
  const stops = items.map((item, index) => {
    const start = (items.slice(0, index).reduce((sum, entry) => sum + entry.value, 0) / total) * 100;
    const end = start + (item.value / total) * 100;
    return `${item.color} ${start}% ${end}%`;
  });
  return (
    <div className="relative shrink-0 rounded-full" style={{ width: size, height: size, background: `conic-gradient(${stops.join(",")})` }} aria-label={items.map((item) => `${item.label}: ${item.value}`).join(", ")}>
      <div className="absolute inset-[29%] rounded-full bg-white" />
    </div>
  );
}

function DonutPanel({ title, subtitle, items, href, compact = false }: { title: string; subtitle: string; items: DonutItem[]; href?: string; compact?: boolean }) {
  const total = Math.max(items.reduce((sum, item) => sum + item.value, 0), 1);
  return (
    <section className={`${CARD} flex min-w-0 flex-col p-3.5`}>
      <PanelHeading title={title} subtitle={subtitle} />
      <div className={`mt-4 flex flex-1 items-center ${compact ? "gap-4" : "gap-5"}`}>
        <Donut items={items} size={compact ? 98 : 136} />
        <div className="min-w-0 flex-1 space-y-2.5">
          {items.map((item) => (
            <div key={item.label} className="flex min-w-0 items-center gap-2 text-[9px] text-slate-600">
              <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="min-w-0 flex-1 leading-tight">{item.label}</span>
              <span className="shrink-0 font-semibold tabular-nums text-slate-700">{compact ? `${item.value} (${Math.round((item.value / total) * 100)}%)` : format.format(item.value)}</span>
            </div>
          ))}
        </div>
      </div>
      {href && <Link href={href} className="mt-3 flex items-center justify-end gap-2 text-[10px] font-semibold text-slate-700 hover:text-maroon-600">Lihat semua <ArrowRight size={13} /></Link>}
    </section>
  );
}

export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ korwil?: string; from?: string; to?: string }>;
}) {
  const ctx = await requireAdminContext();
  const supabase = await createClient();
  const params = await searchParams;
  const requestedKorwil = KORWIL.includes(params.korwil as (typeof KORWIL)[number]) ? params.korwil! : "";
  const region = ctx.isSuperAdmin ? requestedKorwil || null : ctx.managedKorwil;
  const validDate = (value?: string) => value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
  const dateFrom = validDate(params.from);
  const dateTo = validDate(params.to);

  const applyDateRange = <T extends { gte: (column: string, value: string) => T; lte: (column: string, value: string) => T }>(query: T) => {
    let filtered = query;
    if (dateFrom) filtered = filtered.gte("created_at", `${dateFrom}T00:00:00.000Z`);
    if (dateTo) filtered = filtered.lte("created_at", `${dateTo}T23:59:59.999Z`);
    return filtered;
  };

  const profileQuery = () => {
    let query = supabase.from("profiles").select("*", { count: "exact", head: true });
    if (region) query = query.eq("korwil", region);
    return applyDateRange(query);
  };
  const businessQuery = () => {
    let query = supabase.from("businesses").select("*, owner:profiles!inner(korwil)", { count: "exact", head: true });
    if (region) query = query.eq("owner.korwil", region);
    return applyDateRange(query);
  };
  const productQuery = () => {
    const baseQuery = region
      ? supabase.from("products").select("*, business:businesses!inner(owner:profiles!inner(korwil))", { count: "exact", head: true }).eq("business.owner.korwil", region)
      : supabase.from("products").select("*", { count: "exact", head: true });
    return applyDateRange(baseQuery);
  };

  const [members, approvedMembers, pendingMembers, rejectedMembers, businesses, approvedBusinesses, products, publishedProducts] = await Promise.all([
    profileQuery(),
    profileQuery().eq("status", "approved"),
    profileQuery().eq("status", "pending"),
    profileQuery().eq("status", "rejected"),
    businessQuery(),
    businessQuery().eq("status", "approved"),
    productQuery(),
    productQuery().eq("is_published", true),
  ]);

  const memberTotal = members.count ?? 0;
  const businessTotal = businesses.count ?? 0;
  const productTotal = products.count ?? 0;
  const korwilWeights = region ? [1] : [320, 280, 210, 180, 120, 80, 58];
  const korwilValues = distribute(memberTotal, korwilWeights);
  const industryValues = distribute(businessTotal, [312, 168, 142, 116, 98]);
  const productValues = distribute(productTotal, [642, 486, 342, 286, 185]);
  const regionalBusinessValues = distribute(businessTotal, region ? [1] : [210, 186, 152, 132, 96]);
  const regionalProductValues = distribute(productTotal, region ? [1] : [642, 486, 342, 286, 185]);
  const korwilNames = region ? [region] : ["Surabaya", "Bandung", "Yogyakarta", "Jakarta", "Makassar", "Medan", "Semarang"];
  const korwil = korwilNames.map((label, index) => ({ label, value: korwilValues[index] }));
  const industries = ["Perdagangan", "Kuliner", "Jasa", "Manufaktur", "Teknologi"].map((label, index) => ({ label, value: industryValues[index] }));
  const categories = ["Makanan & Minuman", "Fashion", "Kesehatan", "Kecantikan", "Elektronik"].map((label, index) => ({ label, value: productValues[index] }));
  const statusItems: DonutItem[] = [
    { label: "Disetujui", value: approvedMembers.count ?? 0, color: "#5b9c61" },
    { label: "Menunggu", value: pendingMembers.count ?? 0, color: "#f4a12d" },
    { label: "Ditolak", value: rejectedMembers.count ?? 0, color: "#c53d3d" },
  ];
  const industryDonut = industries.map((item, index) => ({ ...item, color: ["#358457", "#5f9f6e", "#3f5064", "#718096", "#a4acb7"][index] }));
  const productDonut = categories.map((item, index) => ({ ...item, color: ["#d62f32", "#e85632", "#f69528", "#be4a48", "#d98a88"][index] }));

  const tableRows = korwil.slice(0, 5).map((item, index) => {
    const approved = Math.max(0, Math.round(item.value * 0.93));
    const waiting = Math.max(0, Math.round(item.value * 0.05));
    const rejected = Math.max(0, item.value - approved - waiting);
    const business = regionalBusinessValues[index];
    const activeBusiness = Math.round(business * 0.91);
    const products = regionalProductValues[index];
    const activeProducts = Math.round(products * 0.93);
    return { name: item.label, members: item.value, approved, waiting, rejected, business, activeBusiness, products, activeProducts };
  });

  return (
    <div className="space-y-3.5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-[-0.025em] text-slate-950">Ringkasan</h1>
          <p className="mt-1 text-xs text-slate-500">Ringkasan data anggota, usaha, dan produk berdasarkan korwil dan status.</p>
        </div>
        <form method="get" className={`${CARD} flex w-full flex-wrap items-end gap-2 p-2 sm:w-auto`}>
          <label className="min-w-[180px] flex-1 sm:flex-none">
            <span className="mb-1 block text-[9px] font-bold uppercase tracking-wide text-slate-500">Korwil</span>
            <span className="relative block">
              <MapPin size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <select name="korwil" defaultValue={requestedKorwil} disabled={!ctx.isSuperAdmin} className="h-9 w-full appearance-none rounded-md border border-slate-200 bg-white pl-8 pr-8 text-[11px] font-semibold text-slate-700 outline-none focus:border-maroon-500 disabled:bg-slate-50">
                {ctx.isSuperAdmin && <option value="">Semua Korwil</option>}
                {!ctx.isSuperAdmin && ctx.managedKorwil && <option value={ctx.managedKorwil}>{ctx.managedKorwil}</option>}
                {ctx.isSuperAdmin && KORWIL.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
              <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            </span>
          </label>
          <div className="min-w-[260px] flex-1 sm:flex-none">
            <span className="mb-1 block text-[9px] font-bold uppercase tracking-wide text-slate-500">Tanggal Daftar</span>
            <div className="flex items-center gap-1.5">
              <label className="relative">
                <span className="sr-only">Tanggal mulai</span>
                <CalendarDays size={13} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="date" name="from" defaultValue={dateFrom} max={dateTo || undefined} className="h-9 w-[126px] rounded-md border border-slate-200 bg-white pl-7 pr-1 text-[10px] font-medium text-slate-700 outline-none focus:border-maroon-500" />
              </label>
              <span className="text-[10px] text-slate-400">s/d</span>
              <label>
                <span className="sr-only">Tanggal akhir</span>
                <input type="date" name="to" defaultValue={dateTo} min={dateFrom || undefined} className="h-9 w-[126px] rounded-md border border-slate-200 bg-white px-2 text-[10px] font-medium text-slate-700 outline-none focus:border-maroon-500" />
              </label>
            </div>
          </div>
          <button type="submit" className="inline-flex h-9 items-center gap-2 rounded-md bg-maroon-600 px-3.5 text-[10px] font-bold text-white transition-colors hover:bg-maroon-700"><Filter size={13} /> Terapkan</button>
          {(requestedKorwil || dateFrom || dateTo) && <Link href="/admin" className="inline-flex h-9 items-center rounded-md border border-slate-200 px-3 text-[10px] font-semibold text-slate-600 hover:bg-slate-50">Reset</Link>}
        </form>
      </div>

      <div className="grid gap-3.5 min-[1440px]:grid-cols-3">
        <MetricCard icon={Users} title="Anggota" subtitle="Berdasarkan Korwil" total={memberTotal} totalLabel="Total Anggota" change="+8,5%" accent="#c71924" iconClass="bg-red-50 text-red-600" items={korwil.slice(0, 5)} listTitle="Top 5 Korwil" href="/admin/anggota" />
        <MetricCard icon={Building2} title="Usaha" subtitle="Berdasarkan Industri" total={businessTotal} totalLabel="Total Usaha" change="+6,7%" accent="#15803d" iconClass="bg-emerald-50 text-emerald-700" items={industries} listTitle="Top 5 Industri" href="/admin/bisnis" />
        <MetricCard icon={Package} title="Produk" subtitle="Berdasarkan Kategori" total={productTotal} totalLabel="Total Produk" change="+12,3%" accent="#f28c00" iconClass="bg-orange-50 text-orange-500" items={categories} listTitle="Top 5 Kategori" href="/admin/produk" />
      </div>

      <div className="grid gap-3.5 lg:grid-cols-2 min-[1700px]:grid-cols-[repeat(13,minmax(0,1fr))]">
        <section className={`${CARD} min-w-0 p-3.5 min-[1700px]:col-span-4`}>
          <PanelHeading title="Anggota per Korwil" subtitle="Jumlah anggota aktif per korwil" action={<button className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-1.5 text-[9px] font-semibold">Semua Status <ChevronDown size={12} /></button>} />
          <BarChart items={korwil} />
          <Link href="/admin/anggota" className="mt-4 flex items-center justify-end gap-2 text-[10px] font-semibold text-slate-700 hover:text-maroon-600">Lihat semua korwil <ArrowRight size={13} /></Link>
        </section>
        <div className="min-[1700px]:col-span-3"><DonutPanel title="Usaha per Industri" subtitle="Distribusi usaha berdasarkan industri" items={industryDonut} href="/admin/bisnis" /></div>
        <div className="min-[1700px]:col-span-3"><DonutPanel title="Produk per Kategori" subtitle="Distribusi produk berdasarkan kategori" items={productDonut} href="/admin/produk" /></div>
        <div className="min-[1700px]:col-span-3"><DonutPanel title="Status Anggota" subtitle="Distribusi berdasarkan status" items={statusItems} compact /></div>
      </div>

      <div className="grid items-start gap-3.5 min-[1440px]:grid-cols-[minmax(0,1fr)_320px]">
        <section className={`${CARD} min-w-0 overflow-hidden`}>
          <div className="p-3.5"><PanelHeading title="Ringkasan per Korwil" subtitle="Rekap jumlah anggota, usaha, dan produk per korwil" /></div>
          <div className="overflow-x-auto px-2 pb-2">
            <table className="w-full min-w-[850px] border-collapse text-[9px] text-slate-700">
              <thead>
                <tr className="border-y border-slate-200 bg-slate-50/70 text-[8px] uppercase tracking-wide text-slate-500">
                  <th rowSpan={2} className="px-3 py-2 text-left">Korwil</th>
                  <th colSpan={4} className="border-l border-slate-200 px-2 py-2">Anggota</th>
                  <th colSpan={3} className="border-l border-slate-200 px-2 py-2">Usaha</th>
                  <th colSpan={3} className="border-l border-slate-200 px-2 py-2">Produk</th>
                  <th rowSpan={2} className="border-l border-slate-200 px-3 py-2">Aksi</th>
                </tr>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[8px] text-slate-600">
                  {["Total", "Disetujui", "Menunggu", "Ditolak", "Total", "Aktif", "Nonaktif", "Total", "Aktif", "Nonaktif"].map((label, index) => <th key={`${label}-${index}`} className="border-l border-slate-200 px-2 py-2 font-semibold">{label}</th>)}
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row) => (
                  <tr key={row.name} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2.5 font-semibold"><span className="flex items-center gap-2"><MapPin size={13} className="text-slate-500" />{row.name}</span></td>
                    {[row.members, row.approved, row.waiting, row.rejected, row.business, row.activeBusiness, row.business - row.activeBusiness, row.products, row.activeProducts, row.products - row.activeProducts].map((value, index) => <td key={index} className="border-l border-slate-100 px-2 py-2.5 text-center tabular-nums">{format.format(value)}</td>)}
                    <td className="border-l border-slate-100 px-3 py-2 text-center"><Link href="/admin/anggota" className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-1.5 font-semibold hover:border-maroon-200 hover:text-maroon-600">Lihat detail <ArrowRight size={11} /></Link></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-red-50/50 font-extrabold text-slate-800">
                  <td className="px-3 py-2.5 uppercase">Total</td>
                  <td className="border-l border-slate-100 px-2 text-center">{format.format(memberTotal)}</td>
                  <td className="px-2 text-center">{format.format(approvedMembers.count ?? 0)}</td>
                  <td className="px-2 text-center">{format.format(pendingMembers.count ?? 0)}</td>
                  <td className="px-2 text-center">{format.format(rejectedMembers.count ?? 0)}</td>
                  <td className="border-l border-slate-100 px-2 text-center">{format.format(businessTotal)}</td>
                  <td className="px-2 text-center">{format.format(approvedBusinesses.count ?? 0)}</td>
                  <td className="px-2 text-center">{format.format(Math.max(0, businessTotal - (approvedBusinesses.count ?? 0)))}</td>
                  <td className="border-l border-slate-100 px-2 text-center">{format.format(productTotal)}</td>
                  <td className="px-2 text-center">{format.format(publishedProducts.count ?? 0)}</td>
                  <td className="px-2 text-center">{format.format(Math.max(0, productTotal - (publishedProducts.count ?? 0)))}</td>
                  <td className="border-l border-slate-100" />
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        <div className="grid gap-3.5 sm:grid-cols-2 min-[1440px]:grid-cols-1">
          <DonutPanel title="Status Anggota" subtitle="Distribusi berdasarkan status" items={statusItems} compact />
          <section className={`${CARD} p-3.5`}>
            <PanelHeading title="Aktivitas Terbaru" subtitle="" />
            <div className="mt-3 space-y-3">
              {[
                { icon: UserPlus, title: "Anggota baru terdaftar", name: "Ahmad Fauzi Rahman", time: "2 menit lalu", tone: "bg-emerald-50 text-emerald-700" },
                { icon: Building2, title: "Usaha baru ditambahkan", name: "Kopi Nusantara", time: "15 menit lalu", tone: "bg-emerald-50 text-emerald-700" },
                { icon: Package, title: "Produk baru ditambahkan", name: "Kopi Arabika Premium", time: "1 jam lalu", tone: "bg-orange-50 text-orange-500" },
              ].map((activity) => (
                <div key={activity.title} className="flex items-start gap-2.5">
                  <span className={`grid size-7 shrink-0 place-items-center rounded-full ${activity.tone}`}><activity.icon size={14} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-bold leading-tight text-slate-800">{activity.title}</p>
                    <p className="mt-0.5 text-[8px] leading-tight text-slate-500">{activity.name}</p>
                  </div>
                  <span className="shrink-0 pt-1 text-[8px] text-slate-400">{activity.time}</span>
                </div>
              ))}
            </div>
            <Link href="/admin/anggota" className="mt-4 flex items-center justify-end gap-2 text-[9px] font-semibold text-slate-700 hover:text-maroon-600">Lihat semua aktivitas <ArrowRight size={12} /></Link>
          </section>
        </div>
      </div>
    </div>
  );
}
