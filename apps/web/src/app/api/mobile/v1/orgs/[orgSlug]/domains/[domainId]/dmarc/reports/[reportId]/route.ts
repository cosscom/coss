import type { DmarcReportResponse } from "@coss/companion";
import { getDmarcReport, getDomain } from "@coss/email";
import {
  MobileApiError,
  mobileRoute,
  requireMobileOrgMember,
  requireMobilePermission,
} from "@/lib/mobile-api";
import { toMobileDmarcReport } from "../../wire";

export const dynamic = "force-dynamic";

// The dashboard's DMARC report page (apps/web/src/app/[orgSlug]/domains/[domainId]/dmarc/[reportId]).
export const GET = mobileRoute(
  async (
    request,
    ctx: RouteContext<"/api/mobile/v1/orgs/[orgSlug]/domains/[domainId]/dmarc/reports/[reportId]">,
  ) => {
    const { orgSlug, domainId, reportId } = await ctx.params;
    const context = await requireMobileOrgMember(request, orgSlug);
    requireMobilePermission(context, { domain: ["read"] });
    const organizationId = context.organization.id;
    const domain = await getDomain({ organizationId, id: domainId });
    if (!domain) throw new MobileApiError(404, "not_found", "Domain not found.");
    const report = await getDmarcReport({ organizationId, domainId: domain.id, id: reportId });
    if (!report) throw new MobileApiError(404, "not_found", "Report not found.");
    return {
      domain: { id: domain.id, name: domain.name },
      report: toMobileDmarcReport(report),
    } satisfies DmarcReportResponse;
  },
);
