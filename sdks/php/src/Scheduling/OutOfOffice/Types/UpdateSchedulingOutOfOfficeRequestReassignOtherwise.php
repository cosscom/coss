<?php

namespace Coss\Scheduling\OutOfOffice\Types;

enum UpdateSchedulingOutOfOfficeRequestReassignOtherwise: string
{
    case Auto = "auto";
    case Leave = "leave";
}
