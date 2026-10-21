import type { SmsSendersResponse } from "@coss/companion";
import { getSmsAccount, listSmsNumbersWithSendability, listSmsRegistrations } from "@coss/sms";
import { listProjectsWithEnvironments } from "@coss/tenancy";
import { mobileRoute, requireMobileOrgMember, requireMobilePermission } from "@/lib/mobile-api";
import { smsProvisioningEnabled } from "@/lib/sms";
import {
  liveEnvironmentLabels,
  smsSendersNotice,
  toMobileSmsCountries,
  toMobileSmsNumber,
  toMobileSmsRegistration,
} from "./wire";

export const dynamic = "force-dynamic";

// The organization's SMS page (apps/web/src/app/[orgSlug]/sms/page.tsx), read-only.
export const GET = mobileRoute(
  async (request, ctx: RouteContext<"/api/mobile/v1/orgs/[orgSlug]/sms">) => {
    const context = await requireMobileOrgMember(request, (await ctx.params).orgSlug);
    requireMobilePermission(context, { smsSender: ["read"] });
    const organizationId = context.organization.id;
    const [numbers, registrations, account, projects] = await Promise.all([
      listSmsNumbersWithSendability(organizationId),
      listSmsRegistrations(organizationId),
      getSmsAccount(organizationId),
      listProjectsWithEnvironments({ organizationId }),
    ]);
    const enabled = smsProvisioningEnabled();
    const labels = liveEnvironmentLabels(projects);
    return {
      notice: smsSendersNotice({ enabled, numbers, registrations }),
      can_create: enabled && context.can({ smsSender: ["create"] }),
      numbers: numbers.map((row) => toMobileSmsNumber(row, labels)),
      registrations: registrations.map(toMobileSmsRegistration),
      countries: toMobileSmsCountries(account),
    } satisfies SmsSendersResponse;
  },
);
