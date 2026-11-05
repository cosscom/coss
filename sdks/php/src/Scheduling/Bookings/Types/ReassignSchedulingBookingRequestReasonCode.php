<?php

namespace Coss\Scheduling\Bookings\Types;

enum ReassignSchedulingBookingRequestReasonCode: string
{
    case HostUnavailable = "host_unavailable";
    case OutOfOffice = "out_of_office";
    case Workload = "workload";
    case CustomerRequest = "customer_request";
    case Offboarding = "offboarding";
    case Other = "other";
}
