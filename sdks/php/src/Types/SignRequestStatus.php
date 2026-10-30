<?php

namespace Coss\Types;

enum SignRequestStatus: string
{
    case Draft = "draft";
    case Sent = "sent";
    case Completed = "completed";
    case Declined = "declined";
    case Canceled = "canceled";
    case Expired = "expired";
}
