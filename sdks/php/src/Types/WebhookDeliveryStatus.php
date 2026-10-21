<?php

namespace Coss\Types;

enum WebhookDeliveryStatus: string
{
    case Pending = "pending";
    case Succeeded = "succeeded";
    case Failed = "failed";
}
