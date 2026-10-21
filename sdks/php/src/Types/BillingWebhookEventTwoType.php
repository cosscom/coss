<?php

namespace Coss\Types;

enum BillingWebhookEventTwoType: string
{
    case BillingPlanChanged = "billing.plan_changed";
}
