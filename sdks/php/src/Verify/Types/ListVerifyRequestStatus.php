<?php

namespace Coss\Verify\Types;

enum ListVerifyRequestStatus: string
{
    case Pending = "pending";
    case Approved = "approved";
    case Expired = "expired";
    case Canceled = "canceled";
    case Failed = "failed";
    case Blocked = "blocked";
}
