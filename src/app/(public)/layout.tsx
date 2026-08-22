import { Megaphone } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { createClient } from "@/lib/supabase/server";
import { getSiteSettings } from "@/lib/settings";

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

  // Set from admin → Pengaturan Sistem. Empty means no banner at all, so the
  // site looks unchanged until someone actually has something to announce.
  const settings = await getSiteSettings();
  const { announcement } = settings;

  return (
    <>
      {announcement.trim() && (
        <div className="bg-maroon-900 px-4 py-2.5 text-center text-sm text-white">
          <p className="shell flex items-center justify-center gap-2">
            <Megaphone size={16} className="shrink-0 text-gold-300" />
            <span>{announcement}</span>
          </p>
        </div>
      )}
      <SiteHeader isSignedIn={!!user} />
      <main>{children}</main>
      <SiteFooter
        contact={{
          email: settings.org_email,
          phone: settings.org_phone,
          address: settings.org_address,
        }}
      />
    </>
  );
}
