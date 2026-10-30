<?php

namespace Coss\Types;

enum SignSignerStatus: string
{
    case Pending = "pending";
    case Notified = "notified";
    case Viewed = "viewed";
    case Signed = "signed";
    case Declined = "declined";
}
