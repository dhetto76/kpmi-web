import type { ReferenceKind, ReferenceValue } from "@/lib/settings.server";
import { ReferenceList } from "./reference-list";

/**
 * The shared body of the korwil / kategori / industri pages.
 *
 * Kept apart from the loader/action factories in
 * `routes/admin/reference-route.server.ts`: a module that a route component
 * imports is part of the client bundle, so it must not pull in server-only
 * code — the `.server` suffix makes the build enforce that.
 */
export function ReferencePage({
  kind,
  loaderData,
}: {
  kind: ReferenceKind;
  loaderData: {
    values: ReferenceValue[];
    usage: Record<string, number>;
    meta: { title: string; singular: string; desc: string };
    canEdit: boolean;
  };
}) {
  const { values, usage, meta, canEdit } = loaderData;

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
        canEdit={canEdit}
      />
    </div>
  );
}
