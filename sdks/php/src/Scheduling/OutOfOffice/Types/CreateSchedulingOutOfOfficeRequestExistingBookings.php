<?php

namespace Coss\Scheduling\OutOfOffice\Types;

enum CreateSchedulingOutOfOfficeRequestExistingBookings: string
{
    case Leave = "leave";
    case Reassign = "reassign";
}
