<?php

namespace Coss\Types;

enum BroadcastStatus: string
{
    case Draft = "draft";
    case Scheduled = "scheduled";
    case Sending = "sending";
    case Paused = "paused";
    case Sent = "sent";
    case Canceled = "canceled";
    case Failed = "failed";
}
