<?php

namespace Coss\Types;

enum SubaccountStatus: string
{
    case Active = "active";
    case Disabled = "disabled";
    case Deleting = "deleting";
}
