import type { HookEndpointResponse } from "@coss/companion";
import {
  findHookApplication,
  getHookEndpoint,
  latestHookEndpointRecovery,
  pageHookDeliveries,
  toHookDeliveryObject,
  toHookEndpointObject,
} from "@coss/hooks";
import {
  cursorParam,
  MobileApiError,
  mobileRoute,
  requireMobileEnvironment,
} from "@/lib/mobile-api";
import { toMobileHookDelivery, toMobileHookEndpoint } from "@/lib/mobile-wire";

export const dynamic = "force-dynamic";

export const GET = mobileRoute(
  async (
    request,
    ctx: RouteContext<"/api/mobile/v1/orgs/[orgSlug]/projects/[projectSlug]/environments/[envSlug]/hooks/[applicationId]/endpoints/[endpointId]">,
  ) => {
    const { applicationId, endpointId, ...params } = await ctx.params;
    const { scope } = await requireMobileEnvironment(request, params, { hook: ["read"] });
    const application = await findHookApplication({ ...scope, ref: applicationId });
    if (!application) throw new MobileApiError(404, "not_found", "Application not found.");
    const organizationId = scope.organizationId;
    const endpoint = await getHookEndpoint({
      organizationId,
      applicationId: application.id,
      id: endpointId,
    });
    if (!endpoint) throw new MobileApiError(404, "not_found", "Endpoint not found.");
    const [page, recovery] = await Promise.all([
      pageHookDeliveries({
        organizationId,
        applicationId: application.id,
        endpointId: endpoint.id,
        limit: 25,
        after: cursorParam(request),
      }),
      latestHookEndpointRecovery({ organizationId, endpointId: endpoint.id }),
    ]);
    return {
      application: { id: application.id, name: application.name },
      endpoint: toMobileHookEndpoint(toHookEndpointObject(endpoint)),
      deliveries: {
        data: page.deliveries.map((row) => toMobileHookDelivery(toHookDeliveryObject(row))),
        next_cursor: page.hasMore ? (page.deliveries.at(-1)?.id ?? null) : null,
      },
      last_recovery: recovery && {
        created_at: recovery.createdAt.toISOString(),
        requeued: recovery.requeued,
        running: recovery.status === "pending",
      },
    } satisfies HookEndpointResponse;
  },
);
