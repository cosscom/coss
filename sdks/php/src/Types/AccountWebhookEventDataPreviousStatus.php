<?php

namespace Coss\Types;

enum AccountWebhookEventDataPreviousStatus: string
{
    case Good = "good";
    case Warning = "warning";
    case Suspended = "suspended";
}
