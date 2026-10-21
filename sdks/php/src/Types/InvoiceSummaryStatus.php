<?php

namespace Coss\Types;

enum InvoiceSummaryStatus: string
{
    case Open = "open";
    case Paid = "paid";
    case Void = "void";
    case Uncollectible = "uncollectible";
}
