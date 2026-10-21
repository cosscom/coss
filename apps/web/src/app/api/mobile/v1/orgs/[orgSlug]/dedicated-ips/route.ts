import { ADD_ONS, PLANS } from "@coss/billing/catalog";
import { formatCents } from "@coss/billing/money";
import type { DedicatedIpsResponse } from "@coss/companion";
import { dedicatedIpPoolObject, READY_MIN_DELIVERIES } from "@coss/email";
import { mobileRoute, requireMobileOrgMember, requireMobilePermission } from "@/lib/mobile-api";

export const dynamic = "force-dynamic";

// The dedicated IPs page (apps/web/src/app/[orgSlug]/dedicated-ips/page.tsx), read-only.
export const GET = mobileRoute(
  async (request, ctx: RouteContext<"/api/mobile/v1/orgs/[orgSlug]/dedicated-ips">) => {
    const context = await requireMobileOrgMember(request, (await ctx.params).orgSlug);
    requireMobilePermission(context, { domain: ["read"] });
    const pool = await dedicatedIpPoolObject(context.organization.id);
    const addOn = ADD_ONS.dedicated_ips;
    return {
      status: pool.status,
      message: pool.message,
      ips: pool.ips.map(({ ip, delivered_7d }) => ({ ip, delivered_7d })),
      dedicated_share: pool.dedicated_share,
      ready_min_deliveries: READY_MIN_DELIVERIES,
      ready_at: pool.ready_at,
      add_on: {
        monthly_price: formatCents(addOn.unitAmountCents),
        plans: addOn.plans.map((plan) => PLANS[plan].name),
      },
      can_read_billing: context.can({ billing: ["read"] }),
    } satisfies DedicatedIpsResponse;
  },
);
