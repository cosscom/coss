<?php

namespace Coss\Types;

enum SchedulingReassignmentWebhookEventDataStatus: string
{
    case Completed = "completed";
    case Cancelled = "cancelled";
}
