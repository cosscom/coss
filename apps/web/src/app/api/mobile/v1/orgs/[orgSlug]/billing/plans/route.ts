import { billingStateAt, PLANS, scheduledManagedContract } from "@coss/billing";
import type { PlansResponse } from "@coss/companion";
import { formatDate } from "@/lib/billing-format";
import { mobileRoute, requireMobileOrgMember, requireMobilePermission } from "@/lib/mobile-api";
import { toMobileAddOns, toMobilePlanIncludes, toMobilePlans, toMobileUsagePrices } from "./wire";

export const dynamic = "force-dynamic";

// The dashboard's plans page (apps/web/src/app/[orgSlug]/settings/billing/plans/page.tsx), read
// only: changing plan stays on coss.com.
export const GET = mobileRoute(
  async (request, ctx: RouteContext<"/api/mobile/v1/orgs/[orgSlug]/billing/plans">) => {
    const context = await requireMobileOrgMember(request, (await ctx.params).orgSlug);
    requireMobilePermission(context, { billing: ["read"] });
    const organizationId = context.organization.id;
    const now = new Date();
    const [state, managedNext] = await Promise.all([
      billingStateAt(organizationId, now),
      scheduledManagedContract(organizationId, now),
    ]);
    const current = PLANS[state.terms.plan];
    // Self-serve changes are refused under a sales contract and while one is scheduled.
    const selfServeContract = !state.contract || state.contract.kind === "self_serve";
    const managedNote =
      selfServeContract && !managedNext
        ? null
        : managedNext && selfServeContract
          ? `A contract with your account manager starts on ${formatDate(managedNext.effectiveFrom)}. Contact them to change your plan.`
          : "Your plan is managed by your contract. Contact your account manager to change it.";
    return {
      plans: toMobilePlans(current.key),
      managed_note: managedNote,
      can_manage: context.can({ billing: ["update"] }),
      includes: toMobilePlanIncludes(),
      add_ons: toMobileAddOns(),
      usage_prices: toMobileUsagePrices(now),
    } satisfies PlansResponse;
  },
);
