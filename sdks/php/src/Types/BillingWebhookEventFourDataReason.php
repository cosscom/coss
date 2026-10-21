<?php

namespace Coss\Types;

enum BillingWebhookEventFourDataReason: string
{
    case Delinquent = "delinquent";
    case SpendLimit = "spend_limit";
    case Admin = "admin";
}
