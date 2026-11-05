<?php

namespace Coss\Scheduling\OutOfOffice\Types;

enum CreateSchedulingOutOfOfficeRequestReassignOtherwise: string
{
    case Auto = "auto";
    case Leave = "leave";
}
