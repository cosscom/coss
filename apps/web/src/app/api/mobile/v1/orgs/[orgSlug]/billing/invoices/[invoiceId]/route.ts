import { getInvoiceObject } from "@coss/billing";
import type { Invoice } from "@coss/companion";
import {
  MobileApiError,
  mobileRoute,
  requireMobileOrgMember,
  requireMobilePermission,
} from "@/lib/mobile-api";
import { toMobileInvoiceSummary } from "@/lib/mobile-wire";

export const dynamic = "force-dynamic";

export const GET = mobileRoute(
  async (
    request,
    ctx: RouteContext<"/api/mobile/v1/orgs/[orgSlug]/billing/invoices/[invoiceId]">,
  ) => {
    const { orgSlug, invoiceId } = await ctx.params;
    const context = await requireMobileOrgMember(request, orgSlug);
    requireMobilePermission(context, { billing: ["read"] });
    const invoice = await getInvoiceObject(context.organization.id, invoiceId);
    if (!invoice) throw new MobileApiError(404, "not_found", "Invoice not found.");
    return {
      ...toMobileInvoiceSummary(invoice),
      subtotal: invoice.subtotal,
      discount: invoice.discount,
      credit: invoice.credit,
      tax: invoice.tax,
      amount_paid: invoice.amount_paid,
      lines: invoice.lines.map((line) => ({
        id: line.id,
        description: line.description,
        quantity: line.quantity,
        amount: line.amount,
      })),
    } satisfies Invoice;
  },
);
