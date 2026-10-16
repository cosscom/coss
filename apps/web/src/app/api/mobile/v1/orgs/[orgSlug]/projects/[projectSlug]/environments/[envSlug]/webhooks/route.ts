import type { WebhookEndpoint } from "@coss/companion";
import { listWebhookEndpoints, toWebhookEndpointObject } from "@coss/webhooks";
import { mobileRoute, requireMobileEnvironment } from "@/lib/mobile-api";
import { toMobileEndpoint } from "@/lib/mobile-wire";

export const dynamic = "force-dynamic";

export const GET = mobileRoute(
  async (
    request,
    ctx: RouteContext<"/api/mobile/v1/orgs/[orgSlug]/projects/[projectSlug]/environments/[envSlug]/webhooks">,
  ) => {
    const { scope } = await requireMobileEnvironment(request, await ctx.params, {
      webhook: ["read"],
    });
    const endpoints = await listWebhookEndpoints(scope);
    return {
      data: endpoints.map((row) => toMobileEndpoint(toWebhookEndpointObject(row))),
    } satisfies { data: WebhookEndpoint[] };
  },
);
