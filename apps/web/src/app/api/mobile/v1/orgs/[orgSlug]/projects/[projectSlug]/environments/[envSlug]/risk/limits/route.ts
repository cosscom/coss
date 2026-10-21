import type { RiskLimitBucketsResponse } from "@coss/companion";
import { listRiskLimitBuckets } from "@coss/risk";
import { mobileRoute, requireMobileEnvironment } from "@/lib/mobile-api";
import { toMobileRiskLimitBucket } from "./wire";

export const dynamic = "force-dynamic";

// The dashboard's risk/limits page.
export const GET = mobileRoute(
  async (
    request,
    ctx: RouteContext<"/api/mobile/v1/orgs/[orgSlug]/projects/[projectSlug]/environments/[envSlug]/risk/limits">,
  ) => {
    const { scope } = await requireMobileEnvironment(request, await ctx.params, {
      risk: ["read"],
    });
    const buckets = await listRiskLimitBuckets(scope);
    return {
      data: buckets.data.map(toMobileRiskLimitBucket),
    } satisfies RiskLimitBucketsResponse;
  },
);
