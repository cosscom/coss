<?php

namespace Coss\Types;

enum VerificationWebhookEventDataStatus: string
{
    case Pending = "pending";
    case Approved = "approved";
    case Expired = "expired";
    case Canceled = "canceled";
    case Failed = "failed";
    case Blocked = "blocked";
}
