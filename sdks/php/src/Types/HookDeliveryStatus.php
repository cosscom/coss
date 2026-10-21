<?php

namespace Coss\Types;

enum HookDeliveryStatus: string
{
    case Pending = "pending";
    case Succeeded = "succeeded";
    case Failed = "failed";
}
