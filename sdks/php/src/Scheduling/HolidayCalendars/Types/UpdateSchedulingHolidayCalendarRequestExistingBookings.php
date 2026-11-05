<?php

namespace Coss\Scheduling\HolidayCalendars\Types;

enum UpdateSchedulingHolidayCalendarRequestExistingBookings: string
{
    case Leave = "leave";
    case Reassign = "reassign";
}
