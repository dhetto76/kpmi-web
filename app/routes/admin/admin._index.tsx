import { Form, Link, data } from "react-router";
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
import type { Route } from "./+types/admin._index";
import { requireAdminContext } from "@/lib/auth.server";
import { KORWIL } from "@/lib/reference-data";

export const meta: Route.MetaFunction = () => [{ title: "Ringkasan | Panel Admin" }];

const format = new Intl.NumberFormat("id-ID");

type ListItem = { label: string; value: number };
type DonutItem = ListItem & { color: string };

/** One row of the `korwil_summary` RPC. Postgres bigints arrive as strings. */
type KorwilSummaryRow = {
  korwil: string;
  members: number;
  approved_members: number;
  pending_members: number;
  rejected_members: number;
  businesses: number;
  approved_businesses: number;
  products: number;
  published_products: number;
};

const CARD = "rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_4px_rgba(15,23,42,0.04)]";

const MEMBER_STATUS_OPTIONS = [
  { value: "", label: "Semua Status" },
  { value: "approved", label: "Disetujui" },
  { value: "pending", label: "Menunggu" },
  { value: "rejected", label: "Ditolak" },
] as const;

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
          <Link to={href} className="mt-auto flex items-center justify-end gap-2 pt-3 text-[10px] font-semibold text-slate-700 hover:text-maroon-600">
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
    <div className="mt-4 grid h-[148px] items-end gap-2 border-b border-slate-200 bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_48px,#f1f5f9_49px)] px-2" style={{ gridTemplateColumns: `repeat(${Math.max(items.length, 1)}, minmax(0, 1fr))` }}>
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
      {href && <Link to={href} className="mt-3 flex items-center justify-end gap-2 text-[10px] font-semibold text-slate-700 hover:text-maroon-600">Lihat semua <ArrowRight size={13} /></Link>}
    </section>
  );
}


export async function loader({ request }: Route.LoaderArgs) {
  const { context: ctx, supabase, headers } = await requireAdminContext(request);

  const params = new URL(request.url).searchParams;
  const requestedKorwil = KORWIL.includes(params.get("korwil") as (typeof KORWIL)[number])
    ? params.get("korwil")!
    : "";
  const region = ctx.isSuperAdmin ? requestedKorwil || null : ctx.managedKorwil;

  const requestedStatus =
    (["approved", "pending", "rejected"] as const).find((value) => value === params.get("status")) ?? "";

  const validDate = (value: string | null) =>
    value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
  const dateFrom = validDate(params.get("from"));
  const dateTo = validDate(params.get("to"));

  const { data: summaryRows, error } = await supabase.rpc("korwil_summary", {
    date_from: dateFrom ? `${dateFrom}T00:00:00.000Z` : null,
    date_to: dateTo ? `${dateTo}T23:59:59.999Z` : null,
  });
  if (error) throw new Response(error.message, { status: 500 });

  // The RPC scopes rows to the caller's administrative region; a super admin
  // narrowing the view with the korwil filter is applied here.
  const rows = ((summaryRows ?? []) as KorwilSummaryRow[]).filter(
    (row) => !region || row.korwil === region,
  );

  const sum = (pick: (row: KorwilSummaryRow) => number) =>
    rows.reduce((total, row) => total + Number(pick(row)), 0);

  return data(
    {
      isSuperAdmin: ctx.isSuperAdmin,
      managedKorwil: ctx.managedKorwil,
      requestedKorwil,
      requestedStatus,
      region,
      dateFrom,
      dateTo,
      korwilRows: rows.map((row) => ({
        korwil: row.korwil,
        members: Number(row.members),
        approvedMembers: Number(row.approved_members),
        pendingMembers: Number(row.pending_members),
        rejectedMembers: Number(row.rejected_members),
        businesses: Number(row.businesses),
        approvedBusinesses: Number(row.approved_businesses),
        products: Number(row.products),
        publishedProducts: Number(row.published_products),
      })),
      counts: {
        members: sum((row) => row.members),
        approvedMembers: sum((row) => row.approved_members),
        pendingMembers: sum((row) => row.pending_members),
        rejectedMembers: sum((row) => row.rejected_members),
        businesses: sum((row) => row.businesses),
        approvedBusinesses: sum((row) => row.approved_businesses),
        products: sum((row) => row.products),
        publishedProducts: sum((row) => row.published_products),
      },
    },
    { headers },
  );
}

export default function AdminOverviewPage({ loaderData }: Route.ComponentProps) {
  const { isSuperAdmin, managedKorwil, requestedKorwil, requestedStatus, dateFrom, dateTo, counts, korwilRows } = loaderData;
  const ctx = { isSuperAdmin, managedKorwil };

  const memberTotal = counts.members;
  const businessTotal = counts.businesses;
  const productTotal = counts.products;
  const approvedMembers = { count: counts.approvedMembers };
  const pendingMembers = { count: counts.pendingMembers };
  const rejectedMembers = { count: counts.rejectedMembers };
  const approvedBusinesses = { count: counts.approvedBusinesses };
  const publishedProducts = { count: counts.publishedProducts };

  const memberByStatus = (row: (typeof korwilRows)[number]) =>
    requestedStatus === "approved" ? row.approvedMembers
    : requestedStatus === "pending" ? row.pendingMembers
    : requestedStatus === "rejected" ? row.rejectedMembers
    : row.members;

  const korwil = korwilRows.map((row) => ({ label: row.korwil, value: row.members }));
  // There are 45 korwil, far more than the chart can label legibly, so it
  // shows the largest regions for the selected status.
  const korwilChart = [...korwilRows]
    .map((row) => ({ label: row.korwil, value: memberByStatus(row) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 7);

  // TODO: industry and category breakdowns are still derived from the totals
  // rather than grouped by businesses.industry / products.category.
  const industryValues = distribute(businessTotal, [312, 168, 142, 116, 98]);
  const productValues = distribute(productTotal, [642, 486, 342, 286, 185]);
  const industries = ["Perdagangan", "Kuliner", "Jasa", "Manufaktur", "Teknologi"].map((label, index) => ({ label, value: industryValues[index] }));
  const categories = ["Makanan & Minuman", "Fashion", "Kesehatan", "Kecantikan", "Elektronik"].map((label, index) => ({ label, value: productValues[index] }));
  const statusItems: DonutItem[] = [
    { label: "Disetujui", value: approvedMembers.count, color: "#5b9c61" },
    { label: "Menunggu", value: pendingMembers.count, color: "#f4a12d" },
    { label: "Ditolak", value: rejectedMembers.count, color: "#c53d3d" },
  ];
  const industryDonut = industries.map((item, index) => ({ ...item, color: ["#358457", "#5f9f6e", "#3f5064", "#718096", "#a4acb7"][index] }));
  const productDonut = categories.map((item, index) => ({ ...item, color: ["#d62f32", "#e85632", "#f69528", "#be4a48", "#d98a88"][index] }));

  const tableRows = korwilRows.map((row) => ({
    name: row.korwil,
    members: row.members,
    approved: row.approvedMembers,
    waiting: row.pendingMembers,
    rejected: row.rejectedMembers,
    business: row.businesses,
    activeBusiness: row.approvedBusinesses,
    products: row.products,
    activeProducts: row.publishedProducts,
  }));
  return (
    <div className="space-y-3.5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-[-0.025em] text-slate-950">Ringkasan</h1>
          <p className="mt-1 text-xs text-slate-500">Ringkasan data anggota, usaha, dan produk berdasarkan korwil dan status.</p>
        </div>
        <Form method="get" className={`${CARD} flex w-full flex-wrap items-end gap-2 p-2 sm:w-auto`}>
          {requestedStatus && <input type="hidden" name="status" value={requestedStatus} />}
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
          {(requestedKorwil || requestedStatus || dateFrom || dateTo) && <Link to="/admin" className="inline-flex h-9 items-center rounded-md border border-slate-200 px-3 text-[10px] font-semibold text-slate-600 hover:bg-slate-50">Reset</Link>}
        </Form>
      </div>

      <div className="grid gap-3.5 min-[1440px]:grid-cols-3">
        <MetricCard icon={Users} title="Anggota" subtitle="Berdasarkan Korwil" total={memberTotal} totalLabel="Total Anggota" change="+8,5%" accent="#c71924" iconClass="bg-red-50 text-red-600" items={korwil.slice(0, 5)} listTitle="Top 5 Korwil" href="/admin/anggota" />
        <MetricCard icon={Building2} title="Usaha" subtitle="Berdasarkan Industri" total={businessTotal} totalLabel="Total Usaha" change="+6,7%" accent="#15803d" iconClass="bg-emerald-50 text-emerald-700" items={industries} listTitle="Top 5 Industri" href="/admin/bisnis" />
        <MetricCard icon={Package} title="Produk" subtitle="Berdasarkan Kategori" total={productTotal} totalLabel="Total Produk" change="+12,3%" accent="#f28c00" iconClass="bg-orange-50 text-orange-500" items={categories} listTitle="Top 5 Kategori" href="/admin/produk" />
      </div>

      <div className="grid gap-3.5 lg:grid-cols-2 min-[1700px]:grid-cols-[repeat(13,minmax(0,1fr))]">
        <section className={`${CARD} min-w-0 p-3.5 min-[1700px]:col-span-4`}>
          <PanelHeading
            title="Anggota per Korwil"
            subtitle={`Jumlah anggota per korwil — ${(MEMBER_STATUS_OPTIONS.find((option) => option.value === requestedStatus) ?? MEMBER_STATUS_OPTIONS[0]).label.toLowerCase()}`}
            action={
              <Form method="get" className="shrink-0">
                {requestedKorwil && <input type="hidden" name="korwil" value={requestedKorwil} />}
                {dateFrom && <input type="hidden" name="from" value={dateFrom} />}
                {dateTo && <input type="hidden" name="to" value={dateTo} />}
                <label className="relative block">
                  <span className="sr-only">Filter status anggota</span>
                  <select
                    name="status"
                    defaultValue={requestedStatus}
                    onChange={(event) => event.currentTarget.form?.requestSubmit()}
                    className="h-[26px] w-full appearance-none rounded-md border border-slate-200 bg-white pl-3 pr-7 text-[9px] font-semibold text-slate-700 outline-none focus:border-maroon-500"
                  >
                    {MEMBER_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" />
                </label>
                <noscript><button type="submit" className="mt-1 text-[9px] font-semibold text-slate-600">Terapkan</button></noscript>
              </Form>
            }
          />
          {korwilChart.length > 0
            ? <BarChart items={korwilChart} />
            : <p className="mt-4 flex h-[148px] items-center justify-center text-[10px] text-slate-400">Belum ada data anggota untuk filter ini.</p>}
          <Link to="/admin/anggota" className="mt-4 flex items-center justify-end gap-2 text-[10px] font-semibold text-slate-700 hover:text-maroon-600">Lihat semua korwil <ArrowRight size={13} /></Link>
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
                    <td className="border-l border-slate-100 px-3 py-2 text-center"><Link to={`/admin/anggota?korwil=${encodeURIComponent(row.name)}`} className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-1.5 font-semibold hover:border-maroon-200 hover:text-maroon-600">Lihat detail <ArrowRight size={11} /></Link></td>
                  </tr>
                ))}
                {tableRows.length === 0 && (
                  <tr><td colSpan={12} className="px-3 py-8 text-center text-[10px] text-slate-400">Belum ada data untuk filter ini.</td></tr>
                )}
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
            <Link to="/admin/anggota" className="mt-4 flex items-center justify-end gap-2 text-[9px] font-semibold text-slate-700 hover:text-maroon-600">Lihat semua aktivitas <ArrowRight size={12} /></Link>
          </section>
        </div>
      </div>
    </div>
  );
}
