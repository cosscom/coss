<?php

namespace Coss\Types;

enum BillingHoldsItemReason: string
{
    case Delinquent = "delinquent";
    case SpendLimit = "spend_limit";
    case Admin = "admin";
}
