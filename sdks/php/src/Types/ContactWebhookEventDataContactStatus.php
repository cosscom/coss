<?php

namespace Coss\Types;

enum ContactWebhookEventDataContactStatus: string
{
    case Subscribed = "subscribed";
    case Unsubscribed = "unsubscribed";
    case Pending = "pending";
}
