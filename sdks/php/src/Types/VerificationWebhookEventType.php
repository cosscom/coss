<?php

namespace Coss\Types;

enum VerificationWebhookEventType: string
{
    case VerificationApproved = "verification.approved";
    case VerificationFailed = "verification.failed";
    case VerificationBlocked = "verification.blocked";
}
