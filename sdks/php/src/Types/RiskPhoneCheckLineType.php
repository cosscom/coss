<?php

namespace Coss\Types;

enum RiskPhoneCheckLineType: string
{
    case Mobile = "mobile";
    case Landline = "landline";
    case FixedVoip = "fixed_voip";
    case NonFixedVoip = "non_fixed_voip";
    case TollFree = "toll_free";
    case Premium = "premium";
    case SharedCost = "shared_cost";
    case Personal = "personal";
    case Uan = "uan";
    case Voicemail = "voicemail";
    case Pager = "pager";
    case Unknown = "unknown";
}
