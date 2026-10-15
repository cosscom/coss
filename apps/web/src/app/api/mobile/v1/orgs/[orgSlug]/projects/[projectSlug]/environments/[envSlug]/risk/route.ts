import type { RiskAssessmentsResponse } from "@coss/companion";
import { listRiskAssessments } from "@coss/risk";
import { ListRiskAssessmentsQuery } from "@coss/risk/schemas";
import {
  cursorParam,
  MobileApiError,
  mobileRoute,
  requireMobileEnvironment,
} from "@/lib/mobile-api";
import { toMobileRiskSummary } from "@/lib/mobile-wire";

export const dynamic = "force-dynamic";

// The dashboard's views (risk/page.tsx).
const VIEWS = {
  all: {},
  review: { review_status: "open" },
  block: { decision: "block" },
  allow: { decision: "allow" },
} as const;

export const GET = mobileRoute(
  async (
    request,
    ctx: RouteContext<"/api/mobile/v1/orgs/[orgSlug]/projects/[projectSlug]/environments/[envSlug]/risk">,
  ) => {
    const { scope, can } = await requireMobileEnvironment(request, await ctx.params, {
      risk: ["read"],
    });
    const view = new URL(request.url).searchParams.get("view") ?? "all";
    const filter = VIEWS[view as keyof typeof VIEWS] ?? VIEWS.all;
    const query = ListRiskAssessmentsQuery.safeParse({
      ...filter,
      limit: 50,
      after: cursorParam(request),
    });
    if (!query.success) throw new MobileApiError(400, "invalid_request", "Invalid page.");
    const list = await listRiskAssessments(scope, query.data);
    return {
      data: list.data.map(toMobileRiskSummary),
      next_cursor: list.has_more ? (list.data.at(-1)?.id ?? null) : null,
      can_review: can({ risk: ["feedback"] }),
    } satisfies RiskAssessmentsResponse;
  },
);
