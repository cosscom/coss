<?php

namespace Coss\Scheduling\OutOfOffice\Types;

enum PutSchedulingOutOfOfficeRequestReassignOtherwise: string
{
    case Auto = "auto";
    case Leave = "leave";
}
