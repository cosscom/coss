<?php

namespace Coss\Email\Subaccounts\Types;

enum UpdateSubaccountRequestStatus: string
{
    case Active = "active";
    case Disabled = "disabled";
}
