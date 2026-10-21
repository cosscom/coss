<?php

namespace Coss\Types;

enum AccountWebhookEventDataStatus: string
{
    case Good = "good";
    case Warning = "warning";
    case Suspended = "suspended";
}
