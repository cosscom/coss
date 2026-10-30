<?php

namespace Coss\Types;

enum SubaccountWebhookEventType: string
{
    case SubaccountReputationWarning = "subaccount.reputation_warning";
    case SubaccountReputationRecovered = "subaccount.reputation_recovered";
    case SubaccountPaused = "subaccount.paused";
    case SubaccountReinstated = "subaccount.reinstated";
}
