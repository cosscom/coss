import type { RecoverResponse } from "@coss/companion";
import { getWebhookEndpoint, recoverWebhookEndpoint, WebhookError } from "@coss/webhooks";
import { recordAudit } from "@/lib/audit";
import {
  MobileApiError,
  mobileRoute,
  requireMobileEnvironment,
  requireMobileWrite,
} from "@/lib/mobile-api";

export const dynamic = "force-dynamic";

// RECOVER_SINCE_OPTIONS of the dashboard (webhooks/recover.ts).
const SINCE_HOURS = [1, 24, 168, 720];

/** The dashboard's recoverWebhookEndpointAction: same checks, same audit event. */
export const POST = mobileRoute(
  async (
    request,
    ctx: RouteContext<"/api/mobile/v1/orgs/[orgSlug]/projects/[projectSlug]/environments/[envSlug]/webhooks/[endpointId]/recover">,
  ) => {
    const { endpointId, ...params } = await ctx.params;
    const context = await requireMobileEnvironment(request, params, { webhook: ["read"] });
    requireMobileWrite(context, { webhook: ["update"] });
    const body = (await request.json().catch(() => null)) as { since_hours?: unknown } | null;
    const hours = Number(body?.since_hours);
    if (!SINCE_HOURS.includes(hours)) {
      throw new MobileApiError(400, "invalid_request", "Choose how far back to recover.");
    }
    const { scope } = context;
    const endpoint = await getWebhookEndpoint({
      organizationId: scope.organizationId,
      id: endpointId,
    });
    if (!endpoint || endpoint.environmentId !== scope.environmentId) {
      throw new MobileApiError(404, "not_found", "Webhook endpoint not found.");
    }
    const since = new Date(Date.now() - hours * 3_600_000);
    let result: { requeued: number; hasMore: boolean };
    try {
      result = await recoverWebhookEndpoint({
        organizationId: scope.organizationId,
        id: endpoint.id,
        since,
      });
    } catch (error) {
      if (error instanceof WebhookError) {
        throw new MobileApiError(400, "invalid_request", error.message);
      }
      throw error;
    }
    await recordAudit(context.session, {
      organizationId: scope.organizationId,
      action: "webhook_endpoint.recovered",
      target: { type: "webhook_endpoint", id: endpoint.id, label: endpoint.url },
      projectId: endpoint.projectId,
      environmentId: endpoint.environmentId,
      metadata: { since: since.toISOString(), requeued: result.requeued },
    });
    return { requeued: result.requeued, has_more: result.hasMore } satisfies RecoverResponse;
  },
);
