import { cancelScheduledEmail, EmailError } from "@coss/email";
import { recordAudit } from "@/lib/audit";
import {
  MobileApiError,
  mobileRoute,
  requireMobileEnvironment,
  requireMobileWrite,
} from "@/lib/mobile-api";

export const dynamic = "force-dynamic";

/** The dashboard's cancelEmailAction: same checks, same audit event. */
export const POST = mobileRoute(
  async (
    request,
    ctx: RouteContext<"/api/mobile/v1/orgs/[orgSlug]/projects/[projectSlug]/environments/[envSlug]/emails/[emailId]/cancel">,
  ) => {
    const { emailId, ...params } = await ctx.params;
    const context = await requireMobileEnvironment(request, params, { email: ["read"] });
    requireMobileWrite(context, { email: ["send"] });
    const { scope, project } = context;
    try {
      await cancelScheduledEmail({ ...scope, emailId });
    } catch (error) {
      if (error instanceof EmailError) {
        throw error.code === "not_found"
          ? new MobileApiError(404, "not_found", error.message)
          : new MobileApiError(400, "invalid_request", error.message);
      }
      throw error;
    }
    await recordAudit(context.session, {
      action: "email.canceled",
      organizationId: scope.organizationId,
      projectId: project.id,
      environmentId: scope.environmentId,
      target: { type: "email", id: emailId },
    });
    return { canceled: true };
  },
);
