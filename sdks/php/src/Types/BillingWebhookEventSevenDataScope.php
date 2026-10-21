<?php

namespace Coss\Types;

enum BillingWebhookEventSevenDataScope: string
{
    case User = "user";
    case Project = "project";
    case ApiKey = "api_key";
}
