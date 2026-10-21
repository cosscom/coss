import type { DmarcOverviewResponse } from "@coss/companion";
import { dmarcOverview, getDomain } from "@coss/email";
import { emailRuntime } from "@/lib/email-runtime";
import {
  MobileApiError,
  mobileRoute,
  requireMobileOrgMember,
  requireMobilePermission,
} from "@/lib/mobile-api";
import { toMobileDmarcOverview } from "./wire";

export const dynamic = "force-dynamic";

// The dashboard's DMARC tab (apps/web/src/app/[orgSlug]/domains/[domainId]/dmarc/page.tsx); its
// reports are paged by `dmarc/reports`.
export const GET = mobileRoute(
  async (request, ctx: RouteContext<"/api/mobile/v1/orgs/[orgSlug]/domains/[domainId]/dmarc">) => {
    const { orgSlug, domainId } = await ctx.params;
    const context = await requireMobileOrgMember(request, orgSlug);
    requireMobilePermission(context, { domain: ["read"] });
    const domain = await getDomain({ organizationId: context.organization.id, id: domainId });
    if (!domain) throw new MobileApiError(404, "not_found", "Domain not found.");
    const dmarc = await dmarcOverview(domain, emailRuntime().domainDeps.dmarcReportDomain ?? null);
    return toMobileDmarcOverview(domain, dmarc) satisfies DmarcOverviewResponse;
  },
);
