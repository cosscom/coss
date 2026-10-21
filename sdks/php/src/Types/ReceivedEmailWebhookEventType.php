<?php

namespace Coss\Types;

enum ReceivedEmailWebhookEventType: string
{
    case EmailReceived = "email.received";
}
