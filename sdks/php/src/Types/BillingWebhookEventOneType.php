<?php

namespace Coss\Types;

enum BillingWebhookEventOneType: string
{
    case BillingInvoicePaymentFailed = "billing.invoice_payment_failed";
}
