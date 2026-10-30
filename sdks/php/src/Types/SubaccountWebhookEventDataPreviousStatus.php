<?php

namespace Coss\Types;

enum SubaccountWebhookEventDataPreviousStatus: string
{
    case Good = "good";
    case Warning = "warning";
    case Paused = "paused";
}
