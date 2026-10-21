<?php

namespace Coss\Types;

enum HookEndpointRecoveryStatus: string
{
    case Pending = "pending";
    case Completed = "completed";
}
