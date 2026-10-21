<?php

namespace Coss\Types;

enum EmailWebhookEventType: string
{
    case EmailSent = "email.sent";
    case EmailDelivered = "email.delivered";
    case EmailDeliveryDelayed = "email.delivery_delayed";
    case EmailBounced = "email.bounced";
    case EmailComplained = "email.complained";
    case EmailFailed = "email.failed";
    case EmailSuppressed = "email.suppressed";
    case EmailScheduled = "email.scheduled";
    case EmailCanceled = "email.canceled";
    case EmailOpened = "email.opened";
    case EmailClicked = "email.clicked";
    case EmailRescheduled = "email.rescheduled";
    case EmailUnsubscribed = "email.unsubscribed";
}
