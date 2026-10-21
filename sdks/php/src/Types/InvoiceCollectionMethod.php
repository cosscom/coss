<?php

namespace Coss\Types;

enum InvoiceCollectionMethod: string
{
    case ChargeAutomatically = "charge_automatically";
    case SendInvoice = "send_invoice";
}
