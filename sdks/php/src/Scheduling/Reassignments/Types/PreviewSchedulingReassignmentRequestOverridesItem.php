<?php

namespace Coss\Scheduling\Reassignments\Types;

enum PreviewSchedulingReassignmentRequestOverridesItem: string
{
    case AnyHost = "any_host";
    case OutOfOffice = "out_of_office";
    case OutsideAvailability = "outside_availability";
    case HostBusy = "host_busy";
    case LimitReached = "limit_reached";
    case CalendarUnverified = "calendar_unverified";
}
