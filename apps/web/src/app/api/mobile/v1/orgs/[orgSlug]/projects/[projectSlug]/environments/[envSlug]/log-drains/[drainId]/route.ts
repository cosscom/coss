import type { LogDrainResponse } from "@coss/companion";
import {
  countQueuedLogDrainLines,
  getLogDrain,
  pageLogDrainBatches,
  toLogDrainBatchObject,
  toLogDrainObject,
} from "@coss/webhooks";
import {
  cursorParam,
  MobileApiError,
  mobileRoute,
  requireMobileEnvironment,
} from "@/lib/mobile-api";
import { toMobileLogDrain, toMobileLogDrainBatch } from "@/lib/mobile-wire";

export const dynamic = "force-dynamic";

export const GET = mobileRoute(
  async (
    request,
    ctx: RouteContext<"/api/mobile/v1/orgs/[orgSlug]/projects/[projectSlug]/environments/[envSlug]/log-drains/[drainId]">,
  ) => {
    const { drainId, ...params } = await ctx.params;
    const { scope } = await requireMobileEnvironment(request, params, { logDrain: ["read"] });
    const drain = await getLogDrain({ organizationId: scope.organizationId, id: drainId });
    if (!drain || drain.environmentId !== scope.environmentId) {
      throw new MobileApiError(404, "not_found", "Log drain not found.");
    }
    const [page, queued] = await Promise.all([
      pageLogDrainBatches({
        organizationId: scope.organizationId,
        drainId: drain.id,
        limit: 25,
        after: cursorParam(request),
      }),
      countQueuedLogDrainLines({ organizationId: scope.organizationId, drainId: drain.id }),
    ]);
    return {
      drain: toMobileLogDrain(toLogDrainObject(drain)),
      queued_lines: queued,
      batches: {
        data: page.batches.map((entry) => toMobileLogDrainBatch(toLogDrainBatchObject(entry))),
        next_cursor: page.hasMore ? (page.batches.at(-1)?.id ?? null) : null,
      },
    } satisfies LogDrainResponse;
  },
);
