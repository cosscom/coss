import type { RiskAssessment } from "@coss/companion";
import { recordRiskFeedback } from "@coss/risk";
import { CreateRiskFeedbackRequest } from "@coss/risk/schemas";
import { recordAudit } from "@/lib/audit";
import {
  MobileApiError,
  mobileRoute,
  requireMobileEnvironment,
  requireMobileWrite,
} from "@/lib/mobile-api";
import { toMobileRisk } from "@/lib/mobile-wire";
import { riskHasher } from "@/lib/risk";

export const dynamic = "force-dynamic";

/** The dashboard's recordRiskFeedbackAction: same checks, same audit event. */
export const POST = mobileRoute(
  async (
    request,
    ctx: RouteContext<"/api/mobile/v1/orgs/[orgSlug]/projects/[projectSlug]/environments/[envSlug]/risk/[assessmentId]/feedback">,
  ) => {
    const { assessmentId, ...params } = await ctx.params;
    const context = await requireMobileEnvironment(request, params, { risk: ["read"] });
    requireMobileWrite(context, { risk: ["feedback"] });
    const parsed = CreateRiskFeedbackRequest.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      throw new MobileApiError(
        400,
        "invalid_request",
        "Choose an outcome (notes are at most 500 characters).",
      );
    }
    const { scope, session, project } = context;
    // Only an assessment of this environment (and so of this organization) can be changed.
    const assessment = await recordRiskFeedback(riskHasher(), scope, assessmentId, parsed.data, {
      source: "dashboard",
      actorId: session.user.id,
    });
    if (!assessment) throw new MobileApiError(404, "not_found", "Assessment not found.");
    await recordAudit(session, {
      action: "risk_assessment.feedback",
      organizationId: scope.organizationId,
      projectId: project.id,
      environmentId: scope.environmentId,
      target: { type: "risk_assessment", id: assessment.id },
      metadata: { outcome: parsed.data.outcome },
    });
    return toMobileRisk(assessment, true) satisfies RiskAssessment;
  },
);
