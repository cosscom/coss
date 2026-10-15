import type { RiskAssessment } from "@coss/companion";
import { getRiskAssessment } from "@coss/risk";
import { MobileApiError, mobileRoute, requireMobileEnvironment } from "@/lib/mobile-api";
import { toMobileRisk } from "@/lib/mobile-wire";

export const dynamic = "force-dynamic";

export const GET = mobileRoute(
  async (
    request,
    ctx: RouteContext<"/api/mobile/v1/orgs/[orgSlug]/projects/[projectSlug]/environments/[envSlug]/risk/[assessmentId]">,
  ) => {
    const { assessmentId, ...params } = await ctx.params;
    const { scope, can } = await requireMobileEnvironment(request, params, { risk: ["read"] });
    const assessment = await getRiskAssessment(scope, assessmentId);
    if (!assessment) throw new MobileApiError(404, "not_found", "Assessment not found.");
    return toMobileRisk(assessment, can({ risk: ["feedback"] })) satisfies RiskAssessment;
  },
);
