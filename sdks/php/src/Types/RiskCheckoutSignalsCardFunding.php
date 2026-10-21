<?php

namespace Coss\Types;

enum RiskCheckoutSignalsCardFunding: string
{
    case Credit = "credit";
    case Debit = "debit";
    case Prepaid = "prepaid";
    case Unknown = "unknown";
}
