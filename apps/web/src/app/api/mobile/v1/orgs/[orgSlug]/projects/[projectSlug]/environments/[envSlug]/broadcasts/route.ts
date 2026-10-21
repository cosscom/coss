import type { BroadcastListResponse } from "@coss/companion";
import { listBroadcasts } from "@coss/email";
import { cursorParam, mobileRoute, requireMobileEnvironment } from "@/lib/mobile-api";
import { toMobileBroadcastSummary } from "./wire";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

// The dashboard's broadcasts/page.tsx.
export const GET = mobileRoute(
  async (
    request,
    ctx: RouteContext<"/api/mobile/v1/orgs/[orgSlug]/projects/[projectSlug]/environments/[envSlug]/broadcasts">,
  ) => {
    const { scope } = await requireMobileEnvironment(request, await ctx.params, {
      broadcast: ["read"],
    });
    const page = await listBroadcasts(scope, { limit: PAGE_SIZE, after: cursorParam(request) });
    return {
      data: page.data.map(toMobileBroadcastSummary),
      next_cursor: page.has_more ? (page.data.at(-1)?.id ?? null) : null,
    } satisfies BroadcastListResponse;
  },
);
