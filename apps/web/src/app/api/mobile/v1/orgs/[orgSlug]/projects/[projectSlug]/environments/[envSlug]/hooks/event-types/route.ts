import type { HookEventType } from "@coss/companion";
import { pageHookEventTypes } from "@coss/hooks";
import { mobileRoute, requireMobileEnvironment } from "@/lib/mobile-api";

export const dynamic = "force-dynamic";

export const GET = mobileRoute(
  async (
    request,
    ctx: RouteContext<"/api/mobile/v1/orgs/[orgSlug]/projects/[projectSlug]/environments/[envSlug]/hooks/event-types">,
  ) => {
    const { scope } = await requireMobileEnvironment(request, await ctx.params, {
      hook: ["read"],
    });
    const { eventTypes } = await pageHookEventTypes({
      ...scope,
      includeArchived: true,
      limit: 100,
    });
    return {
      data: eventTypes.map((type) => ({
        name: type.name,
        description: type.description,
        archived: type.archivedAt !== null,
      })),
    } satisfies { data: HookEventType[] };
  },
);
