<?php

namespace Coss\Types;

enum ContactConfirmationStatus: string
{
    case Sent = "sent";
    case Cooldown = "cooldown";
    case LimitReached = "limit_reached";
    case NotPending = "not_pending";
}
