<?php

namespace Coss\Types;

enum EmailEventDataBounceType: string
{
    case Permanent = "permanent";
    case Transient = "transient";
    case Undetermined = "undetermined";
}
