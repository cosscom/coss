import type { TemplateVersionsResponse } from "@coss/companion";
import { pageTemplateVersions } from "@coss/email";
import { cursorParam, mobileRoute, requireMobileEnvironment } from "@/lib/mobile-api";
import { templateNotFound, toTemplateRef, toTemplateVersionSummary } from "../../wire";

export const dynamic = "force-dynamic";

// The dashboard's templates/[templateId]/versions/page.tsx pages 20 at a time, by version number.
const PAGE_SIZE = 20;

export const GET = mobileRoute(
  async (
    request,
    ctx: RouteContext<"/api/mobile/v1/orgs/[orgSlug]/projects/[projectSlug]/environments/[envSlug]/templates/[templateId]/versions">,
  ) => {
    const { templateId, ...params } = await ctx.params;
    const { scope } = await requireMobileEnvironment(request, params, {
      emailTemplate: ["read"],
    });
    const after = cursorParam(request);
    const page = await pageTemplateVersions(scope, templateId, {
      limit: PAGE_SIZE,
      after: after && /^\d{1,9}$/.test(after) ? Number(after) : undefined,
    }).catch(templateNotFound);
    const last = page.versions.at(-1)?.version;
    return {
      template: toTemplateRef(page.template),
      data: page.versions.map(toTemplateVersionSummary),
      next_cursor: page.hasMore && last ? String(last) : null,
    } satisfies TemplateVersionsResponse;
  },
);
