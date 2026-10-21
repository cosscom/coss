<?php

namespace Coss\Types;

enum ReceivedSmsWebhookEventType: string
{
    case SmsReceived = "sms.received";
    case SmsOptedOut = "sms.opted_out";
    case SmsOptedIn = "sms.opted_in";
}
