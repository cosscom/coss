import type { SegmentsResponse } from "@coss/companion";
import { listSegments } from "@coss/email";
import { cursorParam, mobileRoute, requireMobileEnvironment } from "@/lib/mobile-api";
import { toMobileSegmentSummary } from "../contacts/wire";

export const dynamic = "force-dynamic";

// The dashboard's segments/page.tsx.
const PAGE_SIZE = 50;

export const GET = mobileRoute(
  async (
    request,
    ctx: RouteContext<"/api/mobile/v1/orgs/[orgSlug]/projects/[projectSlug]/environments/[envSlug]/segments">,
  ) => {
    const { scope } = await requireMobileEnvironment(request, await ctx.params, {
      contact: ["read"],
    });
    const page = await listSegments(scope, { limit: PAGE_SIZE, after: cursorParam(request) });
    return {
      data: page.data.map(toMobileSegmentSummary),
      next_cursor: page.has_more ? (page.data.at(-1)?.id ?? null) : null,
    } satisfies SegmentsResponse;
  },
);
