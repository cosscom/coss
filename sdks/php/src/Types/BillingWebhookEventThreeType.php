<?php

namespace Coss\Types;

enum BillingWebhookEventThreeType: string
{
    case BillingUsageThresholdReached = "billing.usage_threshold_reached";
}
