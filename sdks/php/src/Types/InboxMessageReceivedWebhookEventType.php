<?php

namespace Coss\Types;

enum InboxMessageReceivedWebhookEventType: string
{
    case InboxMessageReceived = "inbox.message.received";
}
