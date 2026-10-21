<?php

namespace Coss\Risk\Rules\Types;

enum CreateRiskRuleRequestMatch: string
{
    case All = "all";
    case Any = "any";
}
