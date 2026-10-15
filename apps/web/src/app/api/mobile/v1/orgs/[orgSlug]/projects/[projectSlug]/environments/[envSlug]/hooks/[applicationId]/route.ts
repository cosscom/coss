import type { HookApplicationResponse } from "@coss/companion";
import {
  findHookApplication,
  listHookEndpoints,
  pageHookMessages,
  toHookEndpointObject,
} from "@coss/hooks";
import { MobileApiError, mobileRoute, requireMobileEnvironment } from "@/lib/mobile-api";
import { toMobileHookEndpoint } from "@/lib/mobile-wire";

export const dynamic = "force-dynamic";

export const GET = mobileRoute(
  async (
    request,
    ctx: RouteContext<"/api/mobile/v1/orgs/[orgSlug]/projects/[projectSlug]/environments/[envSlug]/hooks/[applicationId]">,
  ) => {
    const { applicationId, ...params } = await ctx.params;
    const { scope } = await requireMobileEnvironment(request, params, { hook: ["read"] });
    const application = await findHookApplication({ ...scope, ref: applicationId });
    if (!application) throw new MobileApiError(404, "not_found", "Application not found.");
    const [endpoints, { messages }] = await Promise.all([
      listHookEndpoints({ organizationId: scope.organizationId, applicationId: application.id }),
      pageHookMessages({
        organizationId: scope.organizationId,
        applicationId: application.id,
        limit: 20,
      }),
    ]);
    return {
      application: {
        id: application.id,
        uid: application.uid,
        name: application.name,
        created_at: application.createdAt.toISOString(),
      },
      endpoints: endpoints.map((row) => toMobileHookEndpoint(toHookEndpointObject(row))),
      messages: messages.map((message) => ({
        id: message.id,
        event_type: message.eventType,
        created_at: message.createdAt.toISOString(),
      })),
    } satisfies HookApplicationResponse;
  },
);
