<?php

namespace Coss\Types;

enum SchedulingHolidayCalendarSource: string
{
    case Country = "country";
    case Ics = "ics";
}
