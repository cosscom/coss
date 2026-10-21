<?php

namespace Coss\Types;

enum RiskRuleMatch: string
{
    case All = "all";
    case Any = "any";
}
