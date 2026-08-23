import { data } from "react-router";
import { requireAdminContext } from "@/lib/auth.server";
import {
  listReferenceValues,
  REFERENCE_META,
  type ReferenceKind,
} from "@/lib/settings.server";
import {
  SUPER_ADMIN_ONLY,
  backfillRename,
  countUsage,
  isKind,
  usageCounts,
} from "@/lib/reference.server";
import { slugify } from "@/lib/utils";

/**
 * The korwil / kategori / industri pages, which differ only by `kind`.
 *
 * Next.js shared them through a `<ReferencePage kind=…>` component that each
 * three-line page rendered. A route module cannot be parameterised that way —
 * the loader and action are module-level exports — so the shared parts are
 * factories here and each route file wires its own kind into them.
 */

export function referenceLoader(kind: ReferenceKind) {
  return async ({ request }: { request: Request }) => {
    const { context: ctx, supabase, headers } = await requireAdminContext(request);

    const values = await listReferenceValues(supabase, kind);
    const usage = await usageCounts(supabase, kind, values);
    const meta = REFERENCE_META[kind];

    return data(
      { values, usage, meta, canEdit: ctx.isSuperAdmin },
      { headers },
    );
  };
}

export function referenceAction(kind: ReferenceKind) {
  return async ({ request }: { request: Request }) => {
    const { context: ctx, supabase, headers } = await requireAdminContext(request);

    // Super-admin only. A korwil admin editing the korwil list could invent a
    // region and hand it to themselves. RLS enforces the same rule.
    if (!ctx.isSuperAdmin) {
      return data({ error: SUPER_ADMIN_ONLY }, { status: 403, headers });
    }

    const formData = await request.formData();
    const intent = formData.get("intent");
    const fail = (error: string, status = 400) => data({ error }, { status, headers });

    /* ------------------------------------------------------------ create */
    if (intent === "create") {
      const name = String(formData.get("name") ?? "").trim();
      if (name.length < 2) return fail("Nama minimal 2 karakter.");
      if (name.length > 80) return fail("Nama maksimal 80 karakter.");

      // Append to the end; spacing by 10 leaves room to reorder later.
      const { data: last } = await supabase
        .from("reference_values")
        .select("sort_order")
        .eq("kind", kind)
        .order("sort_order", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { error } = await supabase.from("reference_values").insert({
        kind,
        name,
        slug: slugify(name),
        sort_order: (last?.sort_order ?? 0) + 10,
      });

      if (error) {
        if (error.code === "23505") return fail(`"${name}" sudah ada dalam daftar.`, 409);
        return fail("Gagal menambahkan data.", 500);
      }

      return data({ message: `"${name}" ditambahkan.` }, { headers });
    }

    /* ------------------------------------------------------------ rename */
    if (intent === "rename") {
      const id = String(formData.get("id") ?? "");
      const name = String(formData.get("name") ?? "").trim();
      if (name.length < 2) return fail("Nama minimal 2 karakter.");
      if (name.length > 80) return fail("Nama maksimal 80 karakter.");

      const { data: current } = await supabase
        .from("reference_values")
        .select("kind, name")
        .eq("id", id)
        .maybeSingle();

      if (!current) return fail("Data tidak ditemukan.", 404);
      if (!isKind(current.kind)) return fail("Jenis daftar tidak valid.");
      if (current.name === name) return data({ message: "Nama diperbarui." }, { headers });

      const { error } = await supabase
        .from("reference_values")
        .update({ name, slug: slugify(name) })
        .eq("id", id);

      if (error) {
        if (error.code === "23505") return fail(`"${name}" sudah ada dalam daftar.`, 409);
        return fail("Gagal menyimpan perubahan.", 500);
      }

      const failed = await backfillRename(supabase, current.kind, current.name, name);
      if (failed) return data(failed, { status: 500, headers });

      return data(
        { message: "Nama diperbarui beserta data lama yang memakainya." },
        { headers },
      );
    }

    /* -------------------------------------------------- retire / restore */
    if (intent === "set-active") {
      const id = String(formData.get("id") ?? "");
      const isActive = formData.get("is_active") === "true";

      const { data: current } = await supabase
        .from("reference_values")
        .select("kind")
        .eq("id", id)
        .maybeSingle();

      if (!current) return fail("Data tidak ditemukan.", 404);

      const { error } = await supabase
        .from("reference_values")
        .update({ is_active: isActive })
        .eq("id", id);

      if (error) return fail("Gagal memperbarui status.", 500);

      return data(
        { message: isActive ? "Diaktifkan kembali." : "Dinonaktifkan." },
        { headers },
      );
    }

    /* ------------------------------------------------------------ delete */
    if (intent === "delete") {
      const id = String(formData.get("id") ?? "");

      const { data: current } = await supabase
        .from("reference_values")
        .select("kind, name")
        .eq("id", id)
        .maybeSingle();

      if (!current) return fail("Data tidak ditemukan.", 404);
      if (!isKind(current.kind)) return fail("Jenis daftar tidak valid.");

      // Re-counted here rather than trusting the number the page rendered,
      // which may be minutes stale.
      const used = await countUsage(supabase, current.kind, current.name);
      if (used > 0) {
        return fail(
          `Masih dipakai oleh ${used} data. Nonaktifkan saja agar data lama tetap utuh.`,
          409,
        );
      }

      const { error } = await supabase.from("reference_values").delete().eq("id", id);
      if (error) return fail("Gagal menghapus data.", 500);

      return data({ message: `"${current.name}" dihapus.` }, { headers });
    }

    return fail("Aksi tidak dikenal.");
  };
}

