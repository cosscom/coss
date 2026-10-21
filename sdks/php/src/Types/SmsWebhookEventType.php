<?php

namespace Coss\Types;

enum SmsWebhookEventType: string
{
    case SmsScheduled = "sms.scheduled";
    case SmsSent = "sms.sent";
    case SmsDelivered = "sms.delivered";
    case SmsUndelivered = "sms.undelivered";
    case SmsFailed = "sms.failed";
    case SmsSuppressed = "sms.suppressed";
    case SmsCanceled = "sms.canceled";
}
