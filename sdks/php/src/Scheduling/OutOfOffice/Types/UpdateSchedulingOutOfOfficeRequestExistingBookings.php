<?php

namespace Coss\Scheduling\OutOfOffice\Types;

enum UpdateSchedulingOutOfOfficeRequestExistingBookings: string
{
    case Leave = "leave";
    case Reassign = "reassign";
}
