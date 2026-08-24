import { Link, data } from "react-router";
import { ArrowLeft, Building2, MapPin, Package } from "lucide-react";
import type { Route } from "./+types/anggota.$id";
import { requireAdminContext } from "@/lib/auth.server";
import { createAdminClient } from "@/lib/supabase/admin.server";
import { activeReferenceNames } from "@/lib/settings.server";
import { assignableKorwil } from "@/lib/reference.server";
import { adminSetPasswordSchema, profileSchema } from "@/lib/validations";
import {
  OUT_OF_SCOPE,
  UUID_RE,
  clean,
  grantRole,
  isStatus,
  scopedProfile,
} from "@/lib/admin.server";
import { Card, StatusBadge } from "@/components/ui";
import { StatusControl } from "@/components/admin/status-control";
import { PasswordControl } from "@/components/admin/password-control";
import { RoleControl } from "@/components/admin/role-control";
import { ProfileForm } from "@/components/member/profile-form";
import { formatDate } from "@/lib/utils";

export const meta: Route.MetaFunction = ({ loaderData }) => [
  {
    title: loaderData
      ? `${loaderData.profile.full_name || "Anggota"} | Panel Admin`
      : "Ubah Anggota | Panel Admin",
  },
];

/**
 * Admin editing of a member's profile.
 *
 * The loader reads the profile without a korwil filter — RLS already limits an
 * administrator to their own region, so a row outside it simply is not
 * returned and the page 404s. The explicit check below is defence in depth.
 */
export async function loader({ request, params }: Route.LoaderArgs) {
  const { context: ctx, supabase, headers } = await requireAdminContext(request);

  if (!UUID_RE.test(params.id)) {
    throw new Response("Anggota tidak ditemukan", { status: 404 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (!profile) throw new Response("Anggota tidak ditemukan", { status: 404 });

  if (!ctx.isSuperAdmin && (!ctx.managedKorwil || profile.korwil !== ctx.managedKorwil)) {
    throw new Response("Anggota tidak ditemukan", { status: 404 });
  }

  // The member's businesses, so an administrator can jump straight to the
  // records this profile owns instead of hunting for them by name.
  const { data: businesses } = await supabase
    .from("businesses")
    .select("id, name, status")
    .eq("owner_id", params.id)
    .order("created_at", { ascending: false });

  // Product counts in one read rather than a count query per business, and
  // tallied here rather than with an embedded aggregate — the same explicit
  // shape the rest of the admin panel uses.
  const businessIds = (businesses ?? []).map((business) => business.id as string);
  const tally = new Map<string, number>();
  if (businessIds.length > 0) {
    const { data: products } = await supabase
      .from("products")
      .select("business_id")
      .in("business_id", businessIds);
    for (const product of products ?? []) {
      const key = product.business_id as string;
      tally.set(key, (tally.get(key) ?? 0) + 1);
    }
  }

  return data(
    {
      profile,
      businesses: (businesses ?? []).map((business) => ({
        id: business.id as string,
        name: business.name as string,
        status: business.status as string,
        productCount: tally.get(business.id as string) ?? 0,
      })),
      korwilOptions: await activeReferenceNames(supabase, "korwil"),
      isSuperAdmin: ctx.isSuperAdmin,
      isSelf: params.id === ctx.userId,
      currentUserId: ctx.userId,
    },
    { headers },
  );
}

export async function action({ request, params }: Route.ActionArgs) {
  const { context: ctx, supabase, headers } = await requireAdminContext(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  const fail = (error: string, status = 400) => data({ error }, { status, headers });

  // Every branch is about this one member, so scope is checked once up front
  // rather than repeated per intent.
  const denied = await scopedProfile(supabase, ctx, params.id);
  if (denied) return fail(denied.error, denied.error === OUT_OF_SCOPE ? 403 : 404);

  /* ------------------------------------------------------ member status */
  if (intent === "set-member-status") {
    const status = formData.get("status");
    if (!isStatus(status)) return fail("Status tidak valid.");

    const { error } = await supabase
      .from("profiles")
      .update({ status })
      .eq("id", params.id);

    if (error) return fail("Gagal memperbarui status anggota.", 500);
    return data({ ok: true }, { headers });
  }

  /* -------------------------------------------------------- role grant */
  if (intent === "set-member-role") {
    // Super-admin only, and validated against the live korwil list — the same
    // rule /admin/anggota and /admin/pengguna apply, in one shared helper.
    const grantDenied = await grantRole(
      supabase,
      ctx,
      {
        id: params.id,
        role: formData.get("role"),
        managedKorwil: String(formData.get("managed_korwil") ?? ""),
      },
      await assignableKorwil(supabase),
    );
    if (grantDenied) return fail(grantDenied.error, grantDenied.status);
    return data({ ok: true }, { headers });
  }

  /* ---------------------------------------------------- set password */
  if (intent === "set-user-password") {
    const parsed = adminSetPasswordSchema.safeParse({
      password: formData.get("password"),
      confirm_password: formData.get("confirm_password"),
    });
    if (!parsed.success) return fail(parsed.error.issues[0].message);

    const { data: target } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", params.id)
      .maybeSingle();

    if (!target) return fail("Anggota tidak ditemukan.", 404);

    // A korwil admin may reset a plain member's password, never a fellow
    // administrator's — that would be a route to taking over the account.
    if (!ctx.isSuperAdmin && target.role !== "member") {
      return fail("Anda hanya dapat mengatur kata sandi anggota biasa.", 403);
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return fail("Fitur kata sandi admin belum dikonfigurasi oleh pengelola sistem.", 500);
    }

    const adminClient = createAdminClient();
    const { error } = await adminClient.auth.admin.updateUserById(params.id, {
      password: parsed.data.password,
    });

    if (error) return fail("Gagal mengatur kata sandi pengguna.", 500);
    return data({ ok: true }, { headers });
  }

  /* -------------------------------------------------------- save profile */
  const fields = Object.fromEntries(formData);

  // korwil is validated against the LIVE list, not profileSchema's frozen
  // enum: a region renamed in settings is a legitimate value the enum has
  // never heard of, and rejecting it would make the member unsavable.
  const submittedKorwil = typeof fields.korwil === "string" ? fields.korwil : "";
  const parsed = profileSchema.safeParse({ ...fields, korwil: "" });
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  const values = clean({ ...parsed.data, korwil: submittedKorwil });

  // korwil moves a member between regions, and the
  // prevent_profile_privilege_escalation trigger rejects that from anyone but
  // a super admin. The field is not rendered for a korwil admin; dropping it
  // here too means a forged post is ignored rather than raising on the trigger.
  if (!ctx.isSuperAdmin) {
    delete values.korwil;
  } else if (submittedKorwil) {
    const [assignable, { data: current }] = await Promise.all([
      activeReferenceNames(supabase, "korwil"),
      supabase.from("profiles").select("korwil").eq("id", params.id).maybeSingle(),
    ]);
    // The member's current region always stays valid, even once retired, so
    // re-saving an unrelated field does not force a region change.
    if (submittedKorwil !== current?.korwil && !assignable.includes(submittedKorwil)) {
      return fail("Wilayah korwil tidak valid.");
    }
  }

  const { error } = await supabase.from("profiles").update(values).eq("id", params.id);
  if (error) return fail("Gagal menyimpan perubahan.", 500);

  return data({ ok: true }, { headers });
}

export default function AdminEditMemberPage({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const { profile, businesses, korwilOptions, isSuperAdmin, isSelf, currentUserId } =
    loaderData;

  const error = actionData && "error" in actionData ? actionData.error : null;
  const saved = actionData !== undefined && "ok" in actionData;

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/admin/anggota"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-maroon-600"
        >
          <ArrowLeft size={15} /> Kembali ke daftar anggota
        </Link>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl font-extrabold text-maroon-900">
            {profile.full_name || "(tanpa nama)"}
          </h1>
          <StatusBadge status={profile.status} />
        </div>

        <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-600">
          <span className="inline-flex items-center gap-1.5">
            <MapPin size={14} className="text-gray-400" />
            {profile.korwil ? `Korwil ${profile.korwil}` : "Tanpa korwil"}
          </span>
          <span className="text-gray-500">Bergabung {formatDate(profile.created_at)}</span>
        </p>
      </div>

      <Card className="flex flex-wrap items-start justify-between gap-4 p-5">
        <div>
          <div className="font-display font-bold text-maroon-900">Status Keanggotaan</div>
          <p className="mt-0.5 text-sm text-gray-600">
            Profil hanya tampil di direktori publik setelah disetujui.
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-2">
          <StatusControl kind="member" id={profile.id} status={profile.status} />
          {(isSuperAdmin || profile.role === "member") && (
            <PasswordControl
              id={profile.id}
              userName={profile.full_name || "anggota tanpa nama"}
            />
          )}
        </div>
      </Card>

      {isSuperAdmin && (
        <Card className="flex flex-wrap items-start justify-between gap-4 p-5">
          <div>
            <div className="font-display font-bold text-maroon-900">Peran</div>
            <p className="mt-0.5 text-sm text-gray-600">
              Admin Korwil hanya dapat mengelola anggota di wilayah yang ditugaskan.
            </p>
          </div>
          <RoleControl
            id={profile.id}
            role={profile.role}
            managedKorwil={profile.managed_korwil}
            isSelf={profile.id === currentUserId}
          />
        </Card>
      )}

      <Card className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <Building2 size={18} className="text-maroon-600" />
          <h2 className="font-display font-bold text-maroon-900">
            Usaha ({businesses.length})
          </h2>
        </div>

        {businesses.length === 0 ? (
          <p className="py-4 text-sm text-gray-500">Anggota ini belum memiliki usaha.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {businesses.map((business) => (
              <li key={business.id}>
                <Link
                  to={`/admin/bisnis/${business.id}`}
                  className="flex items-center justify-between gap-4 py-3 transition-colors hover:bg-gray-50"
                >
                  <span className="min-w-0 truncate font-medium text-gray-900">
                    {business.name}
                  </span>
                  <span className="flex shrink-0 items-center gap-3 text-sm text-gray-600">
                    <span className="inline-flex items-center gap-1">
                      <Package size={14} className="text-gray-400" />
                      {business.productCount}
                    </span>
                    <StatusBadge status={business.status} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div>
        <h2 className="font-display text-lg font-bold text-maroon-900">Ubah Data Anggota</h2>
        <p className="mt-1 text-sm text-gray-600">
          {isSelf
            ? "Ini adalah akun Anda sendiri. Perubahan langsung berlaku pada profil Anda."
            : "Perubahan yang Anda simpan langsung menggantikan data milik anggota."}
        </p>
      </div>

      {/* The member form, posting to this admin route instead of its own. */}
      <ProfileForm
        profile={profile}
        uploadUserId={currentUserId}
        korwilOptions={korwilOptions}
        canEditKorwil={isSuperAdmin}
        error={error}
        saved={saved}
        savedMessage="Data anggota berhasil disimpan."
        submitLabel="Simpan Perubahan"
      />
    </div>
  );
}
