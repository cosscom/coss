<?php

namespace Coss\Types;

enum EmailSummaryStatus: string
{
    case Queued = "queued";
    case Sent = "sent";
    case Failed = "failed";
    case Scheduled = "scheduled";
    case Canceled = "canceled";
}
