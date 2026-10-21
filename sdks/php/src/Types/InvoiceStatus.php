<?php

namespace Coss\Types;

enum InvoiceStatus: string
{
    case Open = "open";
    case Paid = "paid";
    case Void = "void";
    case Uncollectible = "uncollectible";
}
