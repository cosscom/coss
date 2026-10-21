<?php

namespace Coss\Risk\Rules\Types;

enum UpdateRiskRuleRequestMatch: string
{
    case All = "all";
    case Any = "any";
}
