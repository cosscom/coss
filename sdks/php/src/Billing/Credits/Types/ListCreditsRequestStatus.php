<?php

namespace Coss\Billing\Credits\Types;

enum ListCreditsRequestStatus: string
{
    case Active = "active";
    case All = "all";
}
