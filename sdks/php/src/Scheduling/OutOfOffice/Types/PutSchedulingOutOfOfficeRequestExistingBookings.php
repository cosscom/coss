<?php

namespace Coss\Scheduling\OutOfOffice\Types;

enum PutSchedulingOutOfOfficeRequestExistingBookings: string
{
    case Leave = "leave";
    case Reassign = "reassign";
}
