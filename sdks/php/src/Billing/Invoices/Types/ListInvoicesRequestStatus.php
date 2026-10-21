<?php

namespace Coss\Billing\Invoices\Types;

enum ListInvoicesRequestStatus: string
{
    case Open = "open";
    case Paid = "paid";
    case Void = "void";
    case Uncollectible = "uncollectible";
}
