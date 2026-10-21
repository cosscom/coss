<?php

namespace Coss\Types;

enum BillingWebhookEventFourType: string
{
    case BillingHoldPlaced = "billing.hold_placed";
    case BillingHoldLifted = "billing.hold_lifted";
}
