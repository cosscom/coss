<?php

namespace Coss\Scheduling\HolidayCalendars\Types;

enum CreateSchedulingHolidayCalendarRequestExistingBookings: string
{
    case Leave = "leave";
    case Reassign = "reassign";
}
