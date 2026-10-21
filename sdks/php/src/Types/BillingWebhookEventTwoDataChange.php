<?php

namespace Coss\Types;

enum BillingWebhookEventTwoDataChange: string
{
    case Upgrade = "upgrade";
    case Downgrade = "downgrade";
    case Cancellation = "cancellation";
    case Reverted = "reverted";
    case Contract = "contract";
}
