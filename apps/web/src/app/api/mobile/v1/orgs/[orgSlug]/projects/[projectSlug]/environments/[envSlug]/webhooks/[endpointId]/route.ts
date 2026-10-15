import type { WebhookEndpointResponse } from "@coss/companion";
import {
  getWebhookEndpoint,
  pageWebhookDeliveries,
  toWebhookDeliveryObject,
  toWebhookEndpointObject,
} from "@coss/webhooks";
import {
  cursorParam,
  MobileApiError,
  mobileRoute,
  requireMobileEnvironment,
} from "@/lib/mobile-api";
import { toMobileDelivery, toMobileEndpoint } from "@/lib/mobile-wire";

export const dynamic = "force-dynamic";

const STATUSES = ["pending", "succeeded", "failed"] as const;

export const GET = mobileRoute(
  async (
    request,
    ctx: RouteContext<"/api/mobile/v1/orgs/[orgSlug]/projects/[projectSlug]/environments/[envSlug]/webhooks/[endpointId]">,
  ) => {
    const { endpointId, ...params } = await ctx.params;
    const { scope, can } = await requireMobileEnvironment(request, params, {
      webhook: ["read"],
    });
    const endpoint = await getWebhookEndpoint({
      organizationId: scope.organizationId,
      id: endpointId,
    });
    if (!endpoint || endpoint.environmentId !== scope.environmentId) {
      throw new MobileApiError(404, "not_found", "Webhook endpoint not found.");
    }
    const status = new URL(request.url).searchParams.get("status");
    const page = await pageWebhookDeliveries({
      organizationId: scope.organizationId,
      endpointId: endpoint.id,
      status: STATUSES.find((value) => value === status),
      limit: 25,
      after: cursorParam(request),
    });
    return {
      endpoint: toMobileEndpoint(toWebhookEndpointObject(endpoint)),
      deliveries: {
        data: page.deliveries.map((entry) => toMobileDelivery(toWebhookDeliveryObject(entry))),
        next_cursor: page.hasMore ? (page.deliveries.at(-1)?.id ?? null) : null,
      },
      can_update: can({ webhook: ["update"] }),
    } satisfies WebhookEndpointResponse;
  },
);
