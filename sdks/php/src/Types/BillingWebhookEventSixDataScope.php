<?php

namespace Coss\Types;

enum BillingWebhookEventSixDataScope: string
{
    case User = "user";
    case Project = "project";
    case ApiKey = "api_key";
}
