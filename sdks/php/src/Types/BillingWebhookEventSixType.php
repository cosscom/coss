<?php

namespace Coss\Types;

enum BillingWebhookEventSixType: string
{
    case BillingBudgetThresholdReached = "billing.budget_threshold_reached";
}
