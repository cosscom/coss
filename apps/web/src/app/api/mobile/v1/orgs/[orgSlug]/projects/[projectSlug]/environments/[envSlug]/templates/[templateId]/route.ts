import type { TemplateResponse } from "@coss/companion";
import { getTemplateDraft } from "@coss/email";
import { mobileRoute, requireMobileEnvironment } from "@/lib/mobile-api";
import { templateNotFound, toMobileTemplate, toTemplateDraft } from "../wire";

export const dynamic = "force-dynamic";

export const GET = mobileRoute(
  async (
    request,
    ctx: RouteContext<"/api/mobile/v1/orgs/[orgSlug]/projects/[projectSlug]/environments/[envSlug]/templates/[templateId]">,
  ) => {
    const { templateId, ...params } = await ctx.params;
    const { scope } = await requireMobileEnvironment(request, params, {
      emailTemplate: ["read"],
    });
    const { template, draft } = await getTemplateDraft(scope, templateId).catch(templateNotFound);
    return {
      template: toMobileTemplate(template),
      draft: toTemplateDraft(draft),
    } satisfies TemplateResponse;
  },
);
