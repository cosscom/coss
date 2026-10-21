import type { TemplateVersionResponse } from "@coss/companion";
import { getTemplateVersion } from "@coss/email";
import { MobileApiError, mobileRoute, requireMobileEnvironment } from "@/lib/mobile-api";
import { templateNotFound, toTemplateVersion } from "../../../wire";

export const dynamic = "force-dynamic";

export const GET = mobileRoute(
  async (
    request,
    ctx: RouteContext<"/api/mobile/v1/orgs/[orgSlug]/projects/[projectSlug]/environments/[envSlug]/templates/[templateId]/versions/[version]">,
  ) => {
    const { templateId, version: versionParam, ...params } = await ctx.params;
    const { scope } = await requireMobileEnvironment(request, params, {
      emailTemplate: ["read"],
    });
    if (!/^\d{1,9}$/.test(versionParam)) {
      throw new MobileApiError(404, "not_found", "Version not found.");
    }
    const { template, version } = await getTemplateVersion(
      scope,
      templateId,
      Number(versionParam),
    ).catch(templateNotFound);
    if (!version || version.version === null) {
      throw new MobileApiError(404, "not_found", "Version not found.");
    }
    return toTemplateVersion(template, {
      ...version,
      version: version.version,
    }) satisfies TemplateVersionResponse;
  },
);
