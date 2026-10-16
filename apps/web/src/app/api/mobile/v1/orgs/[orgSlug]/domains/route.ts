import type { DomainsResponse } from "@coss/companion";
import { domainObjects, getEmailTenant, listDomains } from "@coss/email";
import { emailRuntime } from "@/lib/email-runtime";
import { mobileRoute, requireMobileOrgMember, requireMobilePermission } from "@/lib/mobile-api";
import { toMobileDomainSummary } from "@/lib/mobile-wire";

export const dynamic = "force-dynamic";

export const GET = mobileRoute(
  async (request, ctx: RouteContext<"/api/mobile/v1/orgs/[orgSlug]/domains">) => {
    const context = await requireMobileOrgMember(request, (await ctx.params).orgSlug);
    requireMobilePermission(context, { domain: ["read"] });
    const organizationId = context.organization.id;
    const [rows, tenant] = await Promise.all([
      listDomains({ organizationId }),
      getEmailTenant(organizationId),
    ]);
    const domains = await domainObjects(
      organizationId,
      rows,
      emailRuntime().domainDeps.dmarcReportDomain ?? null,
    );
    return {
      data: domains.map(toMobileDomainSummary),
      sending_paused: tenant?.sendingStatus === "disabled",
    } satisfies DomainsResponse;
  },
);
