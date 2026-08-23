import { Link, data, redirect } from "react-router";
import { ArrowLeft } from "lucide-react";
import type { Route } from "./+types/bisnis.baru";
import { requireUser } from "@/lib/auth.server";
import { businessSchema } from "@/lib/validations";
import { businessFormValues, clean, uniqueBusinessSlug } from "@/lib/member.server";
import { BusinessForm } from "@/components/member/business-form";

export const meta: Route.MetaFunction = () => [{ title: "Daftarkan Usaha | KPMI" }];

export async function loader({ request }: Route.LoaderArgs) {
  const { user, headers } = await requireUser(request);
  return data({ userId: user.id }, { headers });
}

export async function action({ request }: Route.ActionArgs) {
  const { user, supabase, headers } = await requireUser(request);

  const formData = await request.formData();
  const parsed = businessSchema.safeParse(businessFormValues(formData));
  if (!parsed.success) {
    return data({ error: parsed.error.issues[0].message }, { status: 400, headers });
  }

  const slug = await uniqueBusinessSlug(supabase, parsed.data.name);

  const { error } = await supabase
    .from("businesses")
    .insert({ ...clean(parsed.data), slug, owner_id: user.id });

  if (error) {
    return data(
      { error: "Gagal menyimpan usaha. Silakan coba lagi." },
      { status: 500, headers },
    );
  }

  return redirect("/dashboard/bisnis", { headers });
}

export default function NewBusinessPage({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/dashboard/bisnis"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-maroon-600"
        >
          <ArrowLeft size={15} /> Kembali
        </Link>
        <h1 className="mt-3 font-display text-2xl font-extrabold text-maroon-900">
          Daftarkan Usaha
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Hanya nama usaha yang wajib diisi. Sisanya bisa dilengkapi kapan saja.
        </p>
      </div>

      <BusinessForm userId={loaderData.userId} error={actionData?.error} />
    </div>
  );
}
