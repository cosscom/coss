<?php

namespace Coss\Types;

enum BillingAddOnsItemInterval: string
{
    case Month = "month";
    case Quarter = "quarter";
    case Year = "year";
}
