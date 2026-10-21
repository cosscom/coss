<?php

namespace Coss\Types;

enum RiskCheckoutRequestCardFunding: string
{
    case Credit = "credit";
    case Debit = "debit";
    case Prepaid = "prepaid";
    case Unknown = "unknown";
}
