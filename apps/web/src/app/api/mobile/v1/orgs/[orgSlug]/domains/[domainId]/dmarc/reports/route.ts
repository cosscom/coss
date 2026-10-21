import type { DmarcReportsResponse } from "@coss/companion";
import { getDomain, listDmarcReports } from "@coss/email";
import {
  cursorParam,
  MobileApiError,
  mobileRoute,
  requireMobileOrgMember,
  requireMobilePermission,
} from "@/lib/mobile-api";
import { toMobileDmarcReportSummary } from "../wire";

export const dynamic = "force-dynamic";

// The DMARC page's "Reports" table, 20 to a page like the dashboard's.
const PAGE_SIZE = 20;

export const GET = mobileRoute(
  async (
    request,
    ctx: RouteContext<"/api/mobile/v1/orgs/[orgSlug]/domains/[domainId]/dmarc/reports">,
  ) => {
    const { orgSlug, domainId } = await ctx.params;
    const context = await requireMobileOrgMember(request, orgSlug);
    requireMobilePermission(context, { domain: ["read"] });
    const organizationId = context.organization.id;
    const domain = await getDomain({ organizationId, id: domainId });
    if (!domain) throw new MobileApiError(404, "not_found", "Domain not found.");
    const page = await listDmarcReports({
      organizationId,
      domainId: domain.id,
      limit: PAGE_SIZE,
      after: cursorParam(request),
    });
    return {
      data: page.data.map(toMobileDmarcReportSummary),
      next_cursor: page.hasMore ? (page.data.at(-1)?.id ?? null) : null,
    } satisfies DmarcReportsResponse;
  },
);
