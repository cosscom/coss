<?php

namespace Coss\Types;

enum SmsStatus: string
{
    case Queued = "queued";
    case Scheduled = "scheduled";
    case Sent = "sent";
    case Delivered = "delivered";
    case Undelivered = "undelivered";
    case Failed = "failed";
    case Canceled = "canceled";
}
