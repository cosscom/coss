<?php

namespace Coss\Types;

enum BillingWebhookEventSevenType: string
{
    case BillingBudgetHoldPlaced = "billing.budget_hold_placed";
    case BillingBudgetHoldLifted = "billing.budget_hold_lifted";
}
