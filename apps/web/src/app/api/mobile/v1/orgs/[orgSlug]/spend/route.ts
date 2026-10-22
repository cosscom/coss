import { getBillingAccount } from "@coss/billing";
import type { SpendResponse } from "@coss/companion";
import { mobileRoute, requireMobileOrgMember } from "@/lib/mobile-api";
import { spendOverview } from "@/lib/spend";
import { toMobileMemberSpend, toMobileOrganizationSpend } from "./wire";

export const dynamic = "force-dynamic";

// The organization's Spend page (apps/web/src/app/[orgSlug]/spend/page.tsx): every member may
// open it; those who can't read billing see their personal keys' spend only.
export const GET = mobileRoute(
  async (request, ctx: RouteContext<"/api/mobile/v1/orgs/[orgSlug]/spend">) => {
    const { session, organization, can } = await requireMobileOrgMember(
      request,
      (await ctx.params).orgSlug,
    );
    const now = new Date();
    if (!can({ billing: ["read"] })) {
      const overview = await spendOverview(organization.id, now);
      return toMobileMemberSpend(overview, session.user.id, now) satisfies SpendResponse;
    }
    const [overview, account] = await Promise.all([
      spendOverview(organization.id, now),
      getBillingAccount(organization.id),
    ]);
    return toMobileOrganizationSpend(overview, {
      spendLimitCents: account?.spendLimitCents ?? null,
      now,
    }) satisfies SpendResponse;
  },
);
