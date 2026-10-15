import type { HookMessageResponse } from "@coss/companion";
import {
  findHookApplication,
  getHookMessage,
  listHookAttempts,
  listHookEndpoints,
  listMessageDeliveries,
  toHookAttemptObject,
  toHookDeliveryObject,
} from "@coss/hooks";
import { MobileApiError, mobileRoute, requireMobileEnvironment } from "@/lib/mobile-api";
import { toMobileHookAttempt, toMobileHookDelivery } from "@/lib/mobile-wire";

export const dynamic = "force-dynamic";

// Like the dashboard's message page: the payload and every attempt, response excerpts included.
export const GET = mobileRoute(
  async (
    request,
    ctx: RouteContext<"/api/mobile/v1/orgs/[orgSlug]/projects/[projectSlug]/environments/[envSlug]/hooks/[applicationId]/messages/[messageId]">,
  ) => {
    const { applicationId, messageId, ...params } = await ctx.params;
    const { scope } = await requireMobileEnvironment(request, params, { hook: ["read"] });
    const application = await findHookApplication({ ...scope, ref: applicationId });
    if (!application) throw new MobileApiError(404, "not_found", "Application not found.");
    const organizationId = scope.organizationId;
    const message = await getHookMessage({
      organizationId,
      applicationId: application.id,
      id: messageId,
    });
    if (!message) throw new MobileApiError(404, "not_found", "Message not found.");
    const [deliveries, endpoints] = await Promise.all([
      listMessageDeliveries({ organizationId, message }),
      listHookEndpoints({ organizationId, applicationId: application.id }),
    ]);
    const urls = new Map(endpoints.map((endpoint) => [endpoint.id, endpoint.url]));
    const attempts = await Promise.all(deliveries.map((delivery) => listHookAttempts(delivery)));
    return {
      application: { id: application.id, name: application.name },
      message: {
        id: message.id,
        event_type: message.eventType,
        created_at: message.createdAt.toISOString(),
        payload: message.payload,
      },
      deliveries: deliveries.map((delivery, index) => ({
        ...toMobileHookDelivery(toHookDeliveryObject(delivery)),
        endpoint_url: urls.get(delivery.endpointId) ?? null,
        attempts: (attempts[index] ?? []).map((row) =>
          toMobileHookAttempt(toHookAttemptObject(row)),
        ),
      })),
    } satisfies HookMessageResponse;
  },
);
