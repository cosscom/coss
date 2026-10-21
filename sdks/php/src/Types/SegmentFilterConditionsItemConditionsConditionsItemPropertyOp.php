<?php

namespace Coss\Types;

enum SegmentFilterConditionsItemConditionsConditionsItemPropertyOp: string
{
    case Eq = "eq";
    case Neq = "neq";
    case In = "in";
    case NotIn = "not_in";
    case Gt = "gt";
    case Gte = "gte";
    case Lt = "lt";
    case Lte = "lte";
    case Contains = "contains";
    case StartsWith = "starts_with";
    case Exists = "exists";
    case NotExists = "not_exists";
}
