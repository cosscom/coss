import type { RescheduleEmailResponse } from "@coss/companion";
import { EmailError, rescheduleEmail } from "@coss/email";
import { RescheduleEmailRequest } from "@coss/email/schemas";
import { recordAudit } from "@/lib/audit";
import {
  MobileApiError,
  mobileRoute,
  requireMobileEnvironment,
  requireMobileWrite,
} from "@/lib/mobile-api";

export const dynamic = "force-dynamic";

/** The dashboard's rescheduleEmailAction: same checks, same audit event. */
export const POST = mobileRoute(
  async (
    request,
    ctx: RouteContext<"/api/mobile/v1/orgs/[orgSlug]/projects/[projectSlug]/environments/[envSlug]/emails/[emailId]/reschedule">,
  ) => {
    const { emailId, ...params } = await ctx.params;
    const context = await requireMobileEnvironment(request, params, { email: ["read"] });
    requireMobileWrite(context, { email: ["send"] });
    const parsed = RescheduleEmailRequest.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      throw new MobileApiError(
        400,
        "invalid_request",
        parsed.error.issues[0]?.message ?? "Choose a valid date and time.",
      );
    }
    const { scope, project } = context;
    let email: Awaited<ReturnType<typeof rescheduleEmail>>;
    try {
      email = await rescheduleEmail({
        ...scope,
        emailId,
        scheduledAt: parsed.data.scheduled_at,
      });
    } catch (error) {
      if (error instanceof EmailError) {
        throw error.code === "not_found"
          ? new MobileApiError(404, "not_found", error.message)
          : new MobileApiError(400, "invalid_request", error.message);
      }
      throw error;
    }
    await recordAudit(context.session, {
      organizationId: scope.organizationId,
      action: "email.rescheduled",
      target: { type: "email", id: email.id },
      projectId: project.id,
      environmentId: scope.environmentId,
      metadata: { scheduled_at: email.scheduled_at },
    });
    return {
      scheduled_at: email.scheduled_at ?? parsed.data.scheduled_at,
    } satisfies RescheduleEmailResponse;
  },
);
