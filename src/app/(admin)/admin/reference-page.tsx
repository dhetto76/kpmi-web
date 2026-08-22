import { createClient } from "@/lib/supabase/server";
import { requireAdminContext } from "@/lib/auth";
import {
  listReferenceValues,
  REFERENCE_META,
  type ReferenceKind,
  type ReferenceValue,
} from "@/lib/settings";
import { ReferenceList } from "./reference-list";

/**
 * Server half of a reference-list page.
 *
 * The three settings pages (korwil, kategori, industri) differ only by kind,
 * so each is a three-line file that delegates here.
 */
export async function ReferencePage({ kind }: { kind: ReferenceKind }) {
  const ctx = await requireAdminContext();
  const values = await listReferenceValues(kind);
  const usage = await usageCounts(kind, values);
  const meta = REFERENCE_META[kind];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-maroon-900">{meta.title}</h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-600">{meta.desc}</p>
      </div>

      <ReferenceList
        kind={kind}
        values={values}
        usage={usage}
        title={meta.title}
        singular={meta.singular}
        canEdit={ctx.isSuperAdmin}
      />
    </div>
  );
}

/**
 * How many records use each entry, so the UI can warn before a rename and
 * block a delete that would orphan data.
 *
 * Counted with one grouped read per source rather than a count query per row:
 * korwil alone has 45 entries, which would otherwise be 45 roundtrips.
 */
async function usageCounts(
  kind: ReferenceKind,
  values: ReferenceValue[],
): Promise<Record<string, number>> {
  const supabase = await createClient();
  const tally = new Map<string, number>();

  const add = (name: string | null) => {
    if (!name) return;
    tally.set(name, (tally.get(name) ?? 0) + 1);
  };

  if (kind === "korwil") {
    const { data } = await supabase.from("profiles").select("korwil");
    for (const row of data ?? []) add(row.korwil);
  } else if (kind === "industry") {
    const { data } = await supabase.from("businesses").select("industry");
    for (const row of data ?? []) add(row.industry);
  } else {
    const { data: products } = await supabase.from("products").select("category");
    for (const row of products ?? []) add(row.category);
    const { data: businesses } = await supabase.from("businesses").select("product_category");
    for (const row of businesses ?? []) add(row.product_category);
  }

  // Keyed by row id, which is what the client component looks up.
  return Object.fromEntries(
    values.map((value) => [value.id, tally.get(value.name) ?? 0]),
  );
}
