<?php

namespace Coss\Types;

enum InboxMessageStatus: string
{
    case Received = "received";
    case Queued = "queued";
    case Sent = "sent";
    case Failed = "failed";
    case Scheduled = "scheduled";
    case Canceled = "canceled";
}
