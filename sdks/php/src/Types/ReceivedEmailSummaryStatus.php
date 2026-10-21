<?php

namespace Coss\Types;

enum ReceivedEmailSummaryStatus: string
{
    case Received = "received";
    case Blocked = "blocked";
}
