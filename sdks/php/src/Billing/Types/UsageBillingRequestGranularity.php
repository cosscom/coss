<?php

namespace Coss\Billing\Types;

enum UsageBillingRequestGranularity: string
{
    case Hour = "hour";
    case Day = "day";
    case Month = "month";
}
