<?php

namespace Coss\Types;

enum FormSubmissionWebhookEventType: string
{
    case FormSubmissionReceived = "form.submission.received";
    case FormSubmissionFlagged = "form.submission.flagged";
}
