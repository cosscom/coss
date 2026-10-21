<?php

namespace Coss\Hooks\Endpoints\Types;

enum ListDeliveriesEndpointsRequestStatus: string
{
    case Pending = "pending";
    case Succeeded = "succeeded";
    case Failed = "failed";
}
