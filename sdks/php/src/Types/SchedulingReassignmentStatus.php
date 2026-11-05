<?php

namespace Coss\Types;

enum SchedulingReassignmentStatus: string
{
    case Pending = "pending";
    case Running = "running";
    case Completed = "completed";
    case Cancelled = "cancelled";
}
