<?php

namespace Coss\Billing\Types;

enum UsageBillingRequestGroupBy: string
{
    case Environment = "environment";
    case Project = "project";
    case ApiKey = "api_key";
    case User = "user";
}
