<?php

namespace Coss\Types;

enum SegmentFilterConditionsItemFieldOp: string
{
    case Before = "before";
    case After = "after";
    case WithinDays = "within_days";
}
