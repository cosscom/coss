import { billingObject, listInvoicePage, METERS, PLANS } from "@coss/billing";
import type { BillingResponse } from "@coss/companion";
import { mobileRoute, requireMobileOrgMember, requireMobilePermission } from "@/lib/mobile-api";
import { toMobileInvoiceSummary } from "@/lib/mobile-wire";

export const dynamic = "force-dynamic";

export const GET = mobileRoute(
  async (request, ctx: RouteContext<"/api/mobile/v1/orgs/[orgSlug]/billing">) => {
    const context = await requireMobileOrgMember(request, (await ctx.params).orgSlug);
    requireMobilePermission(context, { billing: ["read"] });
    const organizationId = context.organization.id;
    const [billing, invoices] = await Promise.all([
      billingObject(organizationId),
      listInvoicePage(organizationId, { limit: 12 }),
    ]);
    return {
      plan: billing.plan,
      plan_name: PLANS[billing.plan].name,
      status: billing.status,
      holds: billing.holds,
      period: billing.period,
      estimate: {
        usage: billing.estimate.usage,
        credit: billing.estimate.credit,
        total: billing.estimate.total,
      },
      credit_remaining: billing.credit_remaining,
      spend_limit: billing.spend_limit,
      payment_method: billing.payment_method,
      usage: billing.usage.map((line) => ({
        meter: line.meter,
        label: METERS[line.meter].label,
        units: METERS[line.meter].units,
        quantity: line.quantity,
        included: line.included,
      })),
      invoices: invoices.data.map(toMobileInvoiceSummary),
    } satisfies BillingResponse;
  },
);
