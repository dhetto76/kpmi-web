import { Link, data } from "react-router";
import { ShieldCheck, Users } from "lucide-react";
import type { Route } from "./+types/pengguna";
import { requireAdminContext } from "@/lib/auth.server";
import { createAdminClient } from "@/lib/supabase/admin.server";
import { adminSetPasswordSchema } from "@/lib/validations";
import { assignableKorwil } from "@/lib/reference.server";
import { UUID_RE, grantRole } from "@/lib/admin.server";
import { EmptyState } from "@/components/ui";
import { UserTable, type AdminUserRow } from "@/components/admin/user-table";

export const meta: Route.MetaFunction = () => [{ title: "Pengguna | Panel Admin" }];

/**
 * Accounts with administrative rights.
 *
 * Deliberately separate from /admin/anggota: that page is the membership
 * queue, hundreds of rows deep, where the role column is incidental. This one
 * answers "who can administer this platform", which is the question worth
 * being able to audit at a glance.
 */
export async function loader({ request }: Route.LoaderArgs) {
  const { context: ctx, supabase, headers } = await requireAdminContext(request);

  const { data: rows } = await supabase
    .from("profiles")
    .select("id, full_name, korwil, phone, role, managed_korwil, status, created_at")
    .in("role", ["super_admin", "admin_korwil"])
    .order("role")
    .order("full_name");

  const admins = (rows ?? []) as AdminUserRow[];

  return data(
    {
      admins,
      korwilOptions: await assignableKorwil(supabase),
      isSuperAdmin: ctx.isSuperAdmin,
      currentUserId: ctx.userId,
      superAdmins: admins.filter((user) => user.role === "super_admin").length,
    },
    { headers },
  );
}

export async function action({ request }: Route.ActionArgs) {
  const { context: ctx, supabase, headers } = await requireAdminContext(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  const fail = (error: string, status = 400) => data({ error }, { status, headers });

  if (intent === "set-member-role") {
    // Validated against the live korwil list, so a region retired in settings
    // cannot be assigned to a new admin.
    const denied = await grantRole(
      supabase,
      ctx,
      {
        id: String(formData.get("id") ?? ""),
        role: formData.get("role"),
        managedKorwil: String(formData.get("managed_korwil") ?? ""),
      },
      await assignableKorwil(supabase),
    );
    if (denied) return fail(denied.error, denied.status);
    return data({ ok: true }, { headers });
  }

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

    // This page lists administrators only, so a korwil admin — who may set a
    // password solely for a plain member in their own region — never has a
    // permissible target here. The check is kept rather than assumed.
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

export default function AdminUsersPage({ loaderData }: Route.ComponentProps) {
  const { admins, korwilOptions, isSuperAdmin, currentUserId, superAdmins } = loaderData;
  const korwilAdmins = admins.length - superAdmins;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-maroon-900">Pengguna</h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-600">
          Akun yang memiliki akses administrator. Untuk mengangkat anggota menjadi
          admin, buka{" "}
          <Link to="/admin/anggota" className="font-semibold text-maroon-600 hover:underline">
            daftar anggota
          </Link>{" "}
          lalu ubah perannya.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <SummaryCard
          icon={<ShieldCheck size={20} />}
          label="Super Admin"
          value={superAdmins}
          hint="Akses penuh ke seluruh platform"
          tone="bg-amber-50 text-amber-600"
        />
        <SummaryCard
          icon={<Users size={20} />}
          label="Admin Korwil"
          value={korwilAdmins}
          hint="Akses terbatas pada wilayahnya"
          tone="bg-red-50 text-maroon-600"
        />
      </div>

      {admins.length === 0 ? (
        <EmptyState
          title="Belum ada administrator"
          desc="Ubah peran seorang anggota menjadi Admin Korwil atau Super Admin dari halaman anggota."
          action={
            <Link
              to="/admin/anggota"
              className="text-sm font-bold text-maroon-600 hover:underline"
            >
              Buka daftar anggota
            </Link>
          }
        />
      ) : (
        <UserTable
          users={admins}
          isSuperAdmin={isSuperAdmin}
          currentUserId={currentUserId}
          korwilOptions={korwilOptions}
        />
      )}
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  hint: string;
  tone: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <span className={`grid size-11 shrink-0 place-items-center rounded-full ${tone}`}>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-2xl font-extrabold tabular-nums text-maroon-900">{value}</p>
        <p className="text-sm font-bold text-gray-800">{label}</p>
        <p className="truncate text-xs text-gray-500">{hint}</p>
      </div>
    </div>
  );
}
