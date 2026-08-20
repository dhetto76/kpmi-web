import Link from "next/link";
import { redirect } from "next/navigation";
import { Shield, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AdminNav } from "./admin-nav";

export const metadata = { title: "Panel Admin" };

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/masuk");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/dashboard");

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-maroon-deep">
        <div className="shell flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 text-white">
            <Shield size={20} className="text-gold-300" />
            <span className="font-display font-extrabold">Panel Admin</span>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-white/70 transition-colors hover:text-gold-300"
          >
            <ArrowLeft size={15} /> Dashboard
          </Link>
        </div>
      </header>

      <div className="shell grid gap-8 py-8 lg:grid-cols-[14rem_1fr]">
        <aside className="lg:sticky lg:top-8 lg:self-start">
          <AdminNav />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
