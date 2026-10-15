import { getWebhookEndpoint, updateWebhookEndpoint, WebhookError } from "@coss/webhooks";
import { recordAudit } from "@/lib/audit";
import {
  MobileApiError,
  mobileRoute,
  requireMobileEnvironment,
  requireMobileWrite,
} from "@/lib/mobile-api";
import { webhookManagementDeps } from "@/lib/webhooks";

export const dynamic = "force-dynamic";

/** The dashboard's setWebhookEndpointEnabledAction: same checks, same audit events. */
export const POST = mobileRoute(
  async (
    request,
    ctx: RouteContext<"/api/mobile/v1/orgs/[orgSlug]/projects/[projectSlug]/environments/[envSlug]/webhooks/[endpointId]/enabled">,
  ) => {
    const { endpointId, ...params } = await ctx.params;
    const context = await requireMobileEnvironment(request, params, { webhook: ["read"] });
    requireMobileWrite(context, { webhook: ["update"] });
    const body = (await request.json().catch(() => null)) as { enabled?: unknown } | null;
    if (typeof body?.enabled !== "boolean") {
      throw new MobileApiError(400, "invalid_request", "Say whether to enable the endpoint.");
    }
    const { enabled } = body;
    const { scope } = context;
    const endpoint = await getWebhookEndpoint({
      organizationId: scope.organizationId,
      id: endpointId,
    });
    if (!endpoint || endpoint.environmentId !== scope.environmentId) {
      throw new MobileApiError(404, "not_found", "Webhook endpoint not found.");
    }
    try {
      await updateWebhookEndpoint(
        { organizationId: scope.organizationId, id: endpoint.id, enabled },
        webhookManagementDeps(),
      );
    } catch (error) {
      if (error instanceof WebhookError) {
        throw new MobileApiError(400, "invalid_request", error.message);
      }
      throw error;
    }
    await recordAudit(context.session, {
      organizationId: scope.organizationId,
      action: enabled ? "webhook_endpoint.enabled" : "webhook_endpoint.disabled",
      target: { type: "webhook_endpoint", id: endpoint.id, label: endpoint.url },
      projectId: endpoint.projectId,
      environmentId: endpoint.environmentId,
    });
    return { enabled };
  },
);
