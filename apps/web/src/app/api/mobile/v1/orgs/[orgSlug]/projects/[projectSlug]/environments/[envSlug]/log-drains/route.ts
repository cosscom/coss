import type { LogDrainsResponse } from "@coss/companion";
import { listLogDrains, toLogDrainObject } from "@coss/webhooks";
import { planHas } from "@/lib/billing";
import { mobileRoute, requireMobileEnvironment } from "@/lib/mobile-api";
import { toMobileLogDrain } from "@/lib/mobile-wire";

export const dynamic = "force-dynamic";

export const GET = mobileRoute(
  async (
    request,
    ctx: RouteContext<"/api/mobile/v1/orgs/[orgSlug]/projects/[projectSlug]/environments/[envSlug]/log-drains">,
  ) => {
    const { scope } = await requireMobileEnvironment(request, await ctx.params, {
      logDrain: ["read"],
    });
    const [drains, planAllows] = await Promise.all([
      listLogDrains(scope),
      planHas(scope.organizationId, "logDrains"),
    ]);
    return {
      plan_allows: planAllows,
      data: drains.map((row) => toMobileLogDrain(toLogDrainObject(row))),
    } satisfies LogDrainsResponse;
  },
);
