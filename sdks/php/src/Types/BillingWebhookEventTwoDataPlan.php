<?php

namespace Coss\Types;

enum BillingWebhookEventTwoDataPlan: string
{
    case Free = "free";
    case Pro = "pro";
    case Scale = "scale";
    case Enterprise = "enterprise";
}
