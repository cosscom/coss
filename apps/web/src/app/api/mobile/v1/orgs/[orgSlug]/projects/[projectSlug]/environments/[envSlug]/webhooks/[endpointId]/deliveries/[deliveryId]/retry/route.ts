import { getWebhookEndpoint, retryWebhookDelivery } from "@coss/webhooks";
import { recordAudit } from "@/lib/audit";
import {
  MobileApiError,
  mobileRoute,
  requireMobileEnvironment,
  requireMobileWrite,
} from "@/lib/mobile-api";

export const dynamic = "force-dynamic";

/** The dashboard's retryWebhookDeliveryAction: same checks, same audit event. */
export const POST = mobileRoute(
  async (
    request,
    ctx: RouteContext<"/api/mobile/v1/orgs/[orgSlug]/projects/[projectSlug]/environments/[envSlug]/webhooks/[endpointId]/deliveries/[deliveryId]/retry">,
  ) => {
    const { endpointId, deliveryId, ...params } = await ctx.params;
    const context = await requireMobileEnvironment(request, params, { webhook: ["read"] });
    requireMobileWrite(context, { webhook: ["update"] });
    const { scope } = context;
    const endpoint = await getWebhookEndpoint({
      organizationId: scope.organizationId,
      id: endpointId,
    });
    if (!endpoint || endpoint.environmentId !== scope.environmentId) {
      throw new MobileApiError(404, "not_found", "Webhook endpoint not found.");
    }
    const retried = await retryWebhookDelivery({
      organizationId: scope.organizationId,
      endpointId: endpoint.id,
      id: deliveryId,
    });
    if (!retried) {
      throw new MobileApiError(400, "invalid_request", "This delivery is already scheduled.");
    }
    await recordAudit(context.session, {
      organizationId: scope.organizationId,
      action: "webhook_delivery.retried",
      target: { type: "webhook_endpoint", id: endpoint.id, label: endpoint.url },
      projectId: endpoint.projectId,
      environmentId: endpoint.environmentId,
      metadata: { delivery_id: deliveryId },
    });
    return { retried: true };
  },
);
