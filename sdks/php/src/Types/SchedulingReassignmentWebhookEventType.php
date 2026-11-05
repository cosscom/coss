<?php

namespace Coss\Types;

enum SchedulingReassignmentWebhookEventType: string
{
    case SchedulingReassignmentCompleted = "scheduling.reassignment.completed";
}
