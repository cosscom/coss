<?php

namespace Coss\Types;

enum BillingStatus: string
{
    case Active = "active";
    case PastDue = "past_due";
    case Delinquent = "delinquent";
}
