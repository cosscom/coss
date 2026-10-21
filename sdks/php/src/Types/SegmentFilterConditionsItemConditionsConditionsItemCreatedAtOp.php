<?php

namespace Coss\Types;

enum SegmentFilterConditionsItemConditionsConditionsItemCreatedAtOp: string
{
    case Before = "before";
    case After = "after";
    case WithinDays = "within_days";
}
