<?php

namespace Coss\Types;

enum RiskRuleConditionOperator: string
{
    case Is = "is";
    case Eq = "eq";
    case Neq = "neq";
    case Gt = "gt";
    case Gte = "gte";
    case Lt = "lt";
    case Lte = "lte";
    case In = "in";
    case NotIn = "not_in";
}
