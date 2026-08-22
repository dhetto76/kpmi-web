"use client";

import { BusinessForm } from "@/app/(member)/dashboard/bisnis/business-form";
import { adminUpdateBusiness, adminDeleteBusiness } from "../../actions";
import type { Business } from "@/types/database";

/**
 * The member business form, bound to the admin actions.
 *
 * The form itself is shared so the two panels never drift apart; only the
 * action pair and the page to return to are swapped.
 */
export function AdminBusinessForm({
  business,
  userId,
}: {
  business: Business;
  userId: string;
}) {
  return (
    <BusinessForm
      business={business}
      userId={userId}
      updateAction={adminUpdateBusiness}
      deleteAction={adminDeleteBusiness}
      backHref="/admin/bisnis"
    />
  );
}
