<?php

namespace Coss\Types;

enum InvoiceSummaryCollectionMethod: string
{
    case ChargeAutomatically = "charge_automatically";
    case SendInvoice = "send_invoice";
}
