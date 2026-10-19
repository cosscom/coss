"use server";

import { HIGH_RISK_SMS_COUNTRIES, setUnlockedSmsCountries } from "@coss/sms";
import { getOrganizationForAdmin, recordAdminAction } from "@coss/tenancy/admin";
import { refresh } from "next/cache";
import type { ActionResult } from "@/lib/action-result";
import { ActionError, formString, runAction } from "@/lib/actions";
import { requirePlatformAdminAction } from "@/lib/session";

/**
 * Lets an organization allow some high-risk destination countries (SMS pumping targets), after a
 * platform admin checked its use; recorded in the admin audit log with the reason.
 */
export async function unlockSmsCountriesAction(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const { actor } = await requirePlatformAdminAction();
    const organizationId = formString(formData, "organizationId");
    const organization = await getOrganizationForAdmin(organizationId);
    if (!organization) throw new ActionError("Organization not found.");
    const reason = formString(formData, "reason");
    if (!reason) throw new ActionError("Enter a reason.");
    const countries = formString(formData, "countries")
      .split(/[\s,]+/)
      .map((country) => country.trim().toUpperCase())
      .filter(Boolean);
    const unknown = countries.find((country) => !HIGH_RISK_SMS_COUNTRIES.includes(country));
    if (unknown)
      throw new ActionError(`${unknown} isn't a high-risk country; owners allow it themselves.`);
    const account = await setUnlockedSmsCountries(organizationId, countries);
    await recordAdminAction({
      actor,
      action: "sms.countries_unlocked",
      target: { type: "organization", id: organizationId },
      organizationId,
      reason,
      metadata: { countries: account.unlockedCountries },
    });
    refresh();
    return null;
  });
}
