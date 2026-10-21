<?php

namespace Coss\Types;

enum BillingWebhookEventTwoDataPreviousPlan: string
{
    case Free = "free";
    case Pro = "pro";
    case Scale = "scale";
    case Enterprise = "enterprise";
}
