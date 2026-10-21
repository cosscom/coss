<?php

namespace Coss\Types;

enum SegmentFilterConditionsItemOneOp: string
{
    case Eq = "eq";
    case EndsWith = "ends_with";
    case Contains = "contains";
}
