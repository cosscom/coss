<?php

namespace Coss\Types;

enum BillingScheduledChangePlan: string
{
    case Free = "free";
    case Pro = "pro";
    case Scale = "scale";
    case Enterprise = "enterprise";
}
