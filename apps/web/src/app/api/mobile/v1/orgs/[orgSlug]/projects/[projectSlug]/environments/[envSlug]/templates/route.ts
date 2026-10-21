import type { TemplateListResponse } from "@coss/companion";
import { pageEmailTemplates } from "@coss/email";
import { cursorParam, mobileRoute, requireMobileEnvironment } from "@/lib/mobile-api";
import { toMobileTemplateSummary } from "./wire";

export const dynamic = "force-dynamic";

// The dashboard's templates/page.tsx pages 50 at a time.
const PAGE_SIZE = 50;

export const GET = mobileRoute(
  async (
    request,
    ctx: RouteContext<"/api/mobile/v1/orgs/[orgSlug]/projects/[projectSlug]/environments/[envSlug]/templates">,
  ) => {
    const { scope } = await requireMobileEnvironment(request, await ctx.params, {
      emailTemplate: ["read"],
    });
    const page = await pageEmailTemplates(scope, { limit: PAGE_SIZE, after: cursorParam(request) });
    return {
      data: page.templates.map(toMobileTemplateSummary),
      next_cursor: page.hasMore ? (page.templates.at(-1)?.id ?? null) : null,
    } satisfies TemplateListResponse;
  },
);
