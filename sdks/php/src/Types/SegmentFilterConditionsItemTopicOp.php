<?php

namespace Coss\Types;

enum SegmentFilterConditionsItemTopicOp: string
{
    case Subscribed = "subscribed";
    case NotSubscribed = "not_subscribed";
}
