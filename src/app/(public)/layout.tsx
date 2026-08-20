import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { createClient } from "@/lib/supabase/server";

/**
 * Layout for the public marketing site. Reads the session so the header can
 * show "Dashboard" instead of "Masuk / Daftar" for a signed-in visitor.
 */
export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <>
      <SiteHeader isSignedIn={!!user} />
      <main>{children}</main>
      <SiteFooter />
    </>
  );
}
