<?php

namespace Coss\Types;

enum SignRequestWebhookEventDataSignerStatus: string
{
    case Pending = "pending";
    case Notified = "notified";
    case Viewed = "viewed";
    case Signed = "signed";
    case Declined = "declined";
}
