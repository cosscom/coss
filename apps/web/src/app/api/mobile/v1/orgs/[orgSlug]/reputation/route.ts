import type { ReputationResponse } from "@coss/companion";
import { getEmailTenant } from "@coss/email";
import { getReputationStanding, listReputationEvents } from "@coss/reputation";
import { mobileRoute, requireMobileOrgMember, requireMobilePermission } from "@/lib/mobile-api";
import { toMobileHistory, toMobileStanding } from "@/lib/mobile-wire";

export const dynamic = "force-dynamic";

export const GET = mobileRoute(
  async (request, ctx: RouteContext<"/api/mobile/v1/orgs/[orgSlug]/reputation">) => {
    const { orgSlug } = await ctx.params;
    const context = await requireMobileOrgMember(request, orgSlug);
    requireMobilePermission(context, { reputation: ["read"] });
    const organizationId = context.organization.id;
    const [standing, events, tenant] = await Promise.all([
      getReputationStanding(organizationId),
      listReputationEvents(organizationId, { limit: 50 }),
      getEmailTenant(organizationId),
    ]);
    return {
      standing: toMobileStanding(standing),
      sending_paused: tenant?.sendingStatus === "disabled",
      events: toMobileHistory(events),
    } satisfies ReputationResponse;
  },
);
