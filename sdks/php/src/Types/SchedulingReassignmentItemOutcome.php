<?php

namespace Coss\Types;

enum SchedulingReassignmentItemOutcome: string
{
    case Pending = "pending";
    case Reassigned = "reassigned";
    case SkippedChanged = "skipped_changed";
    case NoCandidate = "no_candidate";
    case Failed = "failed";
    case Cancelled = "cancelled";
}
