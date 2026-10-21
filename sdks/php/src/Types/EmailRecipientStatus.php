<?php

namespace Coss\Types;

enum EmailRecipientStatus: string
{
    case Queued = "queued";
    case Sent = "sent";
    case DeliveryDelayed = "delivery_delayed";
    case Delivered = "delivered";
    case Bounced = "bounced";
    case Suppressed = "suppressed";
    case Complained = "complained";
    case Failed = "failed";
    case Canceled = "canceled";
}
