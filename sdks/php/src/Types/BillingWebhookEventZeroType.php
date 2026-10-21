<?php

namespace Coss\Types;

enum BillingWebhookEventZeroType: string
{
    case BillingInvoiceFinalized = "billing.invoice_finalized";
    case BillingInvoicePaid = "billing.invoice_paid";
    case BillingInvoiceVoided = "billing.invoice_voided";
}
