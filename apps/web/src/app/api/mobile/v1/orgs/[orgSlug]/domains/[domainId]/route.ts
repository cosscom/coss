import type { Domain } from "@coss/companion";
import { domainObject, getDomain } from "@coss/email";
import { listProjectsWithEnvironments } from "@coss/tenancy";
import {
  MobileApiError,
  mobileRoute,
  requireMobileOrgMember,
  requireMobilePermission,
} from "@/lib/mobile-api";
import { toMobileDomain } from "@/lib/mobile-wire";

export const dynamic = "force-dynamic";

export const GET = mobileRoute(
  async (request, ctx: RouteContext<"/api/mobile/v1/orgs/[orgSlug]/domains/[domainId]">) => {
    const { orgSlug, domainId } = await ctx.params;
    const context = await requireMobileOrgMember(request, orgSlug);
    requireMobilePermission(context, { domain: ["read"] });
    const organizationId = context.organization.id;
    const row = await getDomain({ organizationId, id: domainId });
    if (!row) throw new MobileApiError(404, "not_found", "Domain not found.");
    const [domain, projects] = await Promise.all([
      domainObject(row),
      listProjectsWithEnvironments({ organizationId }),
    ]);
    const environmentNames = Object.fromEntries(
      projects.flatMap(({ project, environments }) =>
        environments.map((environment) => [
          environment.id,
          `${project.name} · ${environment.name}`,
        ]),
      ),
    );
    return toMobileDomain(domain, environmentNames) satisfies Domain;
  },
);
