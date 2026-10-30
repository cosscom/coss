<?php

namespace Coss\Types;

enum FormSubmissionWebhookEventDataStatus: string
{
    case PendingConfirmation = "pending_confirmation";
    case Accepted = "accepted";
    case Held = "held";
    case Spam = "spam";
}
