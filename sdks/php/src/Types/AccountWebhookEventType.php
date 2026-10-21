<?php

namespace Coss\Types;

enum AccountWebhookEventType: string
{
    case AccountReputationWarning = "account.reputation_warning";
    case AccountReputationRecovered = "account.reputation_recovered";
    case AccountSuspended = "account.suspended";
    case AccountReinstated = "account.reinstated";
    case AccountMarketingPaused = "account.marketing_paused";
    case AccountMarketingReinstated = "account.marketing_reinstated";
}
