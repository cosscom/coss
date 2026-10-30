<?php

namespace Coss\Types;

enum FormSubmissionStatus: string
{
    case PendingConfirmation = "pending_confirmation";
    case Accepted = "accepted";
    case Held = "held";
    case Spam = "spam";
}
