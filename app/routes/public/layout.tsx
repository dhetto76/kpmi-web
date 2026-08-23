import { Outlet, data } from "react-router";
import { Megaphone } from "lucide-react";
import type { Route } from "./+types/layout";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { getOptionalUser } from "@/lib/auth.server";
import { getSiteSettings } from "@/lib/settings.server";

/**
 * Layout for the public marketing site. Reads the session so the header can
 * show "Dashboard" instead of "Masuk / Daftar" for a signed-in visitor.
 */
export async function loader({ request }: Route.LoaderArgs) {
  const { user, supabase, headers } = await getOptionalUser(request);
  const settings = await getSiteSettings(supabase);

  return data(
    {
      isSignedIn: !!user,
      announcement: settings.announcement,
      contact: {
        email: settings.org_email,
        phone: settings.org_phone,
        address: settings.org_address,
      },
    },
    // Carries any refreshed Supabase session cookie back to the browser.
    { headers },
  );
}

export default function PublicLayout({ loaderData }: Route.ComponentProps) {
  const { isSignedIn, announcement, contact } = loaderData;

  return (
    <>
      {/* Set from admin → Pengaturan Sistem. Empty means no banner at all, so
          the site looks unchanged until someone has something to announce. */}
      {announcement.trim() && (
        <div className="bg-maroon-900 px-4 py-2.5 text-center text-sm text-white">
          <p className="shell flex items-center justify-center gap-2">
            <Megaphone size={16} className="shrink-0 text-gold-300" />
            <span>{announcement}</span>
          </p>
        </div>
      )}
      <SiteHeader isSignedIn={isSignedIn} />
      <main>
        <Outlet />
      </main>
      <SiteFooter contact={contact} />
    </>
  );
}
