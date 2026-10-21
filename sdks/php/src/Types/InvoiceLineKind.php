<?php

namespace Coss\Types;

enum InvoiceLineKind: string
{
    case PlanFee = "plan_fee";
    case Proration = "proration";
    case Usage = "usage";
    case Credit = "credit";
    case Discount = "discount";
    case CommitmentFee = "commitment_fee";
    case CommitmentShortfall = "commitment_shortfall";
    case AddOn = "add_on";
    case Adjustment = "adjustment";
    case WriteOff = "write_off";
}
