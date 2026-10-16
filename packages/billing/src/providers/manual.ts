/**
 * Invoicing off-Stripe: nothing leaves coss.com. Invoices are sent by coss.com's own billing email (the
 * worker queues `invoice_issued`) with a link to the dashboard's printable invoice; payments
 * (wire, check, …) are recorded by a platform admin.
 */
import type { BillingProvider } from "./provider.ts";

export const manualBillingProvider: BillingProvider = {
  name: "manual",
  async ensureCustomer() {
    return null;
  },
  async pushInvoice() {
    return { providerInvoiceId: null, hostedUrl: null, pdfUrl: null };
  },
  async collect() {
    return { state: "sent" };
  },
  async voidInvoice() {},
  async markUncollectible() {},
  async createCreditNote() {
    return { providerCreditNoteId: null };
  },
  async fetchInvoice() {
    return null;
  },
  async createSetupSession() {
    return null;
  },
  async completeSetup() {
    return null;
  },
  async createPortalSession() {
    return null;
  },
  async paymentMethod() {
    return null;
  },
  async interpretEvent() {
    return [];
  },
};
