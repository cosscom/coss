<?php

namespace Coss\Types;

enum BroadcastWebhookEventType: string
{
    case BroadcastSending = "broadcast.sending";
    case BroadcastSent = "broadcast.sent";
    case BroadcastPaused = "broadcast.paused";
    case BroadcastCanceled = "broadcast.canceled";
    case BroadcastFailed = "broadcast.failed";
}
