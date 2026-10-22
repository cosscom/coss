import type { BudgetsResponse } from "@coss/companion";
import { mobileRoute, requireMobileOrgMember, requireMobilePermission } from "@/lib/mobile-api";
import { spendOverview } from "@/lib/spend";
import { toMobileBudgets } from "../wire";

export const dynamic = "force-dynamic";

// The Budgets page (apps/web/src/app/[orgSlug]/spend/budgets/page.tsx), read-only.
export const GET = mobileRoute(
  async (request, ctx: RouteContext<"/api/mobile/v1/orgs/[orgSlug]/spend/budgets">) => {
    const context = await requireMobileOrgMember(request, (await ctx.params).orgSlug);
    requireMobilePermission(context, { billing: ["read"] });
    return toMobileBudgets(await spendOverview(context.organization.id)) satisfies BudgetsResponse;
  },
);
