<?php

namespace Coss\Types;

enum SchedulingOutOfOfficeExistingBookings: string
{
    case Leave = "leave";
    case Reassign = "reassign";
}
