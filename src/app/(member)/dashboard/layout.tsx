import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardNav } from "@/components/layout/dashboard-nav";
import { isAdminRole } from "@/lib/auth";
import { StatusBadge } from "@/components/ui";
import { ORG } from "@/content/site";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Middleware already redirects, but never assume — this page reads user data.
  if (!user) redirect("/masuk");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, status, avatar_url")
    .eq("id", user.id)
    .single();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="shell flex h-16 items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="bg-gold-grad grid h-9 w-9 place-items-center rounded-lg font-extrabold text-maroon-900">
              K
            </div>
            <span className="font-display font-extrabold text-maroon-600">
              {ORG.short}
            </span>
          </Link>

          <div className="flex items-center gap-3">
            {profile?.status && <StatusBadge status={profile.status} />}
            <span className="hidden text-sm font-semibold text-gray-700 sm:block">
              {profile?.full_name || user.email}
            </span>
          </div>
        </div>
      </header>

      <div className="shell grid gap-8 py-8 lg:grid-cols-[15rem_1fr]">
        <aside className="lg:sticky lg:top-8 lg:self-start">
          <DashboardNav isAdmin={isAdminRole(profile?.role)} />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
