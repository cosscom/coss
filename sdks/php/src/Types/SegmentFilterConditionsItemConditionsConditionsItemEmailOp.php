<?php

namespace Coss\Types;

enum SegmentFilterConditionsItemConditionsConditionsItemEmailOp: string
{
    case Eq = "eq";
    case EndsWith = "ends_with";
    case Contains = "contains";
}
