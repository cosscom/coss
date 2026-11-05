<?php

namespace Coss\Types;

enum SchedulingHolidayCalendarExistingBookings: string
{
    case Leave = "leave";
    case Reassign = "reassign";
}
