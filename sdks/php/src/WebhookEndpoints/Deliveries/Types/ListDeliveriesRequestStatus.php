<?php

namespace Coss\WebhookEndpoints\Deliveries\Types;

enum ListDeliveriesRequestStatus: string
{
    case Pending = "pending";
    case Succeeded = "succeeded";
    case Failed = "failed";
}
