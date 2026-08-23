import { Form, Link, data } from "react-router";
import { SlidersHorizontal } from "lucide-react";
import type { Route } from "./+types/anggota";
import { requireAdminContext } from "@/lib/auth.server";
import { createAdminClient } from "@/lib/supabase/admin.server";
import { adminSetPasswordSchema } from "@/lib/validations";
import { KORWIL } from "@/lib/reference-data";
import { EmptyState, Select } from "@/components/ui";
import { MemberTable, type MemberRow } from "@/components/admin/member-table";
import { OUT_OF_SCOPE, UUID_RE, isRole, isStatus } from "@/lib/admin.server";

export const meta: Route.MetaFunction = () => [{ title: "Anggota | Panel Admin" }];

const STATUS_OPTIONS = [
  { value: "pending", label: "Menunggu" },
  { value: "approved", label: "Disetujui" },
  { value: "rejected", label: "Ditolak" },
] as const;

const ROLE_OPTIONS = [
  { value: "member", label: "Anggota" },
  { value: "admin_korwil", label: "Admin Korwil" },
  { value: "super_admin", label: "Super Admin" },
] as const;

export async function loader({ request }: Route.LoaderArgs) {
  const { context: ctx, supabase, headers } = await requireAdminContext(request);
  const params = new URL(request.url).searchParams;

  const rawStatus = params.get("status");
  const rawRole = params.get("role");
  const rawKorwil = params.get("korwil");

  const status = STATUS_OPTIONS.some((o) => o.value === rawStatus) ? rawStatus! : undefined;
  const role = ROLE_OPTIONS.some((o) => o.value === rawRole) ? rawRole! : undefined;
  const korwil =
    ctx.isSuperAdmin && KORWIL.some((o) => o === rawKorwil) ? rawKorwil! : undefined;

  const search = params.get("q")?.trim().slice(0, 100) ?? "";
  const requestedPage = Number.parseInt(params.get("page") ?? "1", 10);
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const pageSize = 50;

  // RLS already limits a korwil admin to their region; the explicit filter
  // also makes the scope clear and keeps the unfiltered result predictable.
  let query = supabase
    .from("profiles")
    .select("id, full_name, korwil, phone, status, role, managed_korwil, created_at", { count: "exact" })
    .order("created_at", { ascending: false });

  if (!ctx.isSuperAdmin && ctx.managedKorwil) {
    query = query.eq("korwil", ctx.managedKorwil);
  } else if (korwil) {
    query = query.eq("korwil", korwil);
  }
  if (status) query = query.eq("status", status);
  if (role) query = query.eq("role", role);
  if (search) {
    // PostgREST's `or` expression is parsed as a mini-language. Quoting and
    // escaping the user value keeps punctuation in names from changing it.
    const escaped = search.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    const pattern = `"%${escaped}%"`;
    query = query.or(`full_name.ilike.${pattern},korwil.ilike.${pattern},phone.ilike.${pattern}`);
  }

  query = query.range((page - 1) * pageSize, page * pageSize - 1);

  const { data: members, count, error } = await query;

  return data(
    {
      members: (members ?? []) as MemberRow[],
      total: count ?? 0,
      error: error?.message ?? null,
      isSuperAdmin: ctx.isSuperAdmin,
      managedKorwil: ctx.managedKorwil,
      currentUserId: ctx.userId,
      filters: { status, role, korwil, search, page, pageSize },
    },
    { headers },
  );
}

/**
 * One action, several intents.
 *
 * Next.js exported a Server Action per operation and the client imported the
 * one it needed. A route has a single action, so the operation travels as an
 * `intent` field — and every branch re-checks the caller's role, because an
 * action never runs the layout's loader.
 */
export async function action({ request }: Route.ActionArgs) {
  const { context: ctx, supabase, headers } = await requireAdminContext(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  const fail = (error: string, status = 400) => data({ error }, { status, headers });

  /* ------------------------------------------------------ member status */
  if (intent === "set-member-status") {
    const id = String(formData.get("id") ?? "");
    const status = formData.get("status");
    if (!UUID_RE.test(id)) return fail("ID anggota tidak valid.");
    if (!isStatus(status)) return fail("Status tidak valid.");

    if (!ctx.isSuperAdmin) {
      const { data: target } = await supabase
        .from("profiles")
        .select("korwil")
        .eq("id", id)
        .maybeSingle();
      if (!target || target.korwil !== ctx.managedKorwil) return fail(OUT_OF_SCOPE, 403);
    }

    const { error } = await supabase.from("profiles").update({ status }).eq("id", id);
    if (error) return fail("Gagal memperbarui status anggota.", 500);
    return data({ ok: true }, { headers });
  }

  /* ----------------------------------------------------- bulk approve */
  if (intent === "approve-members") {
    const ids = [...new Set(formData.getAll("ids").map(String))];
    if (ids.length === 0) return fail("Pilih setidaknya satu anggota.");
    if (ids.length > 100) return fail("Maksimal 100 anggota sekali proses.");
    if (ids.some((id) => !UUID_RE.test(id))) return fail("ID anggota tidak valid.");

    let targetQuery = supabase
      .from("profiles")
      .select("id, korwil")
      .in("id", ids)
      .eq("role", "member");

    if (!ctx.isSuperAdmin) {
      if (!ctx.managedKorwil) return fail(OUT_OF_SCOPE, 403);
      targetQuery = targetQuery.eq("korwil", ctx.managedKorwil);
    }

    const { data: targets, error: targetError } = await targetQuery;
    if (targetError || targets?.length !== ids.length) {
      return fail("Satu atau lebih anggota berada di luar kewenangan Anda.", 403);
    }

    const { data: updated, error } = await supabase
      .from("profiles")
      .update({ status: "approved" })
      .in("id", ids)
      .eq("role", "member")
      .select("id");

    if (error || updated?.length !== ids.length) {
      return fail("Gagal menyetujui anggota yang dipilih.", 500);
    }

    return data({ message: `${updated.length} anggota berhasil disetujui.` }, { headers });
  }

  /* ------------------------------------------------------ bulk delete */
  if (intent === "delete-members") {
    const ids = [...new Set(formData.getAll("ids").map(String))];
    if (ids.length === 0) return fail("Pilih setidaknya satu anggota.");
    if (ids.length > 100) return fail("Maksimal 100 anggota sekali hapus.");
    if (ids.some((id) => !UUID_RE.test(id))) return fail("ID anggota tidak valid.");

    // A security definer function; it enforces scope itself.
    const { data: deleted, error } = await supabase.rpc("delete_members", {
      target_ids: ids,
    });

    if (error) return fail("Gagal menghapus anggota.", 500);

    const deletedCount = typeof deleted === "number" ? deleted : 0;
    if (deletedCount === 0) return fail("Tidak ada anggota yang dapat dihapus.", 403);

    return data({ message: `${deletedCount} anggota berhasil dihapus.` }, { headers });
  }

  /* -------------------------------------------------------- role grant */
  if (intent === "set-member-role") {
    const id = String(formData.get("id") ?? "");
    const role = formData.get("role");
    const managedKorwil = String(formData.get("managed_korwil") ?? "");

    if (!UUID_RE.test(id)) return fail("ID anggota tidak valid.");
    if (!isRole(role)) return fail("Peran tidak valid.");

    // Super admin only — a korwil admin cannot mint other admins, so a single
    // compromised regional account cannot multiply itself.
    if (!ctx.isSuperAdmin) return fail("Hanya Super Admin yang dapat mengubah peran.", 403);

    // Removing your own super admin rights could leave the platform with no
    // administrator at all, and you could not undo it.
    if (id === ctx.userId && role !== "super_admin") {
      return fail("Anda tidak dapat menurunkan peran Anda sendiri.", 403);
    }

    let region: string | null = null;
    if (role === "admin_korwil") {
      if (!managedKorwil) return fail("Pilih wilayah korwil untuk Admin Korwil.");
      if (!(KORWIL as readonly string[]).includes(managedKorwil)) {
        return fail("Wilayah korwil tidak valid.");
      }
      region = managedKorwil;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ role, managed_korwil: region })
      .eq("id", id);

    if (error) return fail("Gagal memperbarui peran.", 500);
    return data({ ok: true }, { headers });
  }

  /* ---------------------------------------------------- set password */
  if (intent === "set-user-password") {
    const id = String(formData.get("id") ?? "");
    if (!UUID_RE.test(id)) return fail("ID pengguna tidak valid.");

    const parsed = adminSetPasswordSchema.safeParse({
      password: formData.get("password"),
      confirm_password: formData.get("confirm_password"),
    });
    if (!parsed.success) return fail(parsed.error.issues[0].message);

    const { data: target, error: targetError } = await supabase
      .from("profiles")
      .select("role, korwil")
      .eq("id", id)
      .maybeSingle();

    if (targetError || !target) return fail("Pengguna tidak ditemukan.", 404);

    if (!ctx.isSuperAdmin) {
      if (
        target.role !== "member" ||
        !ctx.managedKorwil ||
        target.korwil !== ctx.managedKorwil
      ) {
        return fail("Anda hanya dapat mengatur kata sandi anggota di korwil Anda.", 403);
      }
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return fail("Fitur kata sandi admin belum dikonfigurasi oleh pengelola sistem.", 500);
    }

    const adminClient = createAdminClient();
    const { error } = await adminClient.auth.admin.updateUserById(id, {
      password: parsed.data.password,
    });

    if (error) return fail("Gagal mengatur kata sandi pengguna.", 500);
    return data({ ok: true }, { headers });
  }

  return fail("Aksi tidak dikenal.");
}

export default function AdminMembersPage({ loaderData }: Route.ComponentProps) {
  const { members, total, error, isSuperAdmin, managedKorwil, currentUserId, filters } =
    loaderData;
  const { status, role, korwil, search, page, pageSize } = filters;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-maroon-900">Anggota</h1>
        <p className="mt-1 text-sm text-gray-600">
          Cari, verifikasi, dan kelola keanggotaan. Profil tampil publik setelah disetujui.
        </p>
      </div>

      <Form method="get" className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-sm font-bold text-maroon-900">
          <SlidersHorizontal size={16} /> Filter anggota
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto_auto] lg:items-end">
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-500">Korwil</span>
            <Select
              name="korwil"
              defaultValue={isSuperAdmin ? (korwil ?? "") : (managedKorwil ?? "")}
              disabled={!isSuperAdmin}
            >
              <option value="">Semua korwil</option>
              {KORWIL.map((option) => <option key={option} value={option}>{option}</option>)}
            </Select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-500">Status</span>
            <Select name="status" defaultValue={status ?? ""}>
              <option value="">Semua status</option>
              {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </Select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-500">Peran</span>
            <Select name="role" defaultValue={role ?? ""}>
              <option value="">Semua peran</option>
              {ROLE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </Select>
          </label>

          <button type="submit" className="rounded-lg bg-maroon-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-maroon-700">
            Terapkan
          </button>
          <Link to="/admin/anggota" className="rounded-lg px-4 py-2.5 text-center text-sm font-bold text-gray-600 transition-colors hover:bg-gray-100">
            Reset
          </Link>
        </div>
      </Form>

      {error ? (
        <EmptyState
          title="Data anggota gagal dimuat"
          desc={error}
          action={<Link to="/admin/anggota" className="text-sm font-bold text-maroon-600 hover:underline">Reset filter</Link>}
        />
      ) : (
        <MemberTable
          key={`${search}-${status ?? ""}-${role ?? ""}-${korwil ?? ""}-${page}`}
          members={members}
          isSuperAdmin={isSuperAdmin}
          currentUserId={currentUserId}
          initialQuery={search}
          total={total}
          page={page}
          pageSize={pageSize}
        />
      )}
    </div>
  );
}
