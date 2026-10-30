<?php

namespace Coss\Types;

enum SubaccountWebhookEventDataStatus: string
{
    case Good = "good";
    case Warning = "warning";
    case Paused = "paused";
}
