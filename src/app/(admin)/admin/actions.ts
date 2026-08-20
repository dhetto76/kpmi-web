"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { error: string } | { success: true };

/**
 * Admin actions.
 *
 * Each re-checks the admin role server-side. Middleware also gates /admin, and
 * RLS gates the tables — three layers, because privilege escalation is the
 * failure that matters most here.
 */
async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/masuk");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/dashboard");
  return { supabase, user };
}

const STATUSES = ["pending", "approved", "rejected"] as const;
type Status = (typeof STATUSES)[number];

function isStatus(value: string): value is Status {
  return (STATUSES as readonly string[]).includes(value);
}

export async function setMemberStatus(
  id: string,
  status: string,
): Promise<ActionResult> {
  if (!isStatus(status)) return { error: "Status tidak valid." };
  const { supabase } = await requireAdmin();

  const { error } = await supabase.from("profiles").update({ status }).eq("id", id);
  if (error) return { error: "Gagal memperbarui status anggota." };

  revalidatePath("/admin/anggota");
  return { success: true };
}

export async function setBusinessStatus(
  id: string,
  status: string,
): Promise<ActionResult> {
  if (!isStatus(status)) return { error: "Status tidak valid." };
  const { supabase } = await requireAdmin();

  const { error } = await supabase.from("businesses").update({ status }).eq("id", id);
  if (error) return { error: "Gagal memperbarui status usaha." };

  revalidatePath("/admin/bisnis");
  revalidatePath("/bisnis");
  return { success: true };
}

export async function setProductPublished(
  id: string,
  isPublished: boolean,
): Promise<ActionResult> {
  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from("products")
    .update({ is_published: isPublished })
    .eq("id", id);

  if (error) return { error: "Gagal memperbarui produk." };

  revalidatePath("/admin/produk");
  revalidatePath("/produk");
  return { success: true };
}
