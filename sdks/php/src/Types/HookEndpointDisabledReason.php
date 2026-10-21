<?php

namespace Coss\Types;

enum HookEndpointDisabledReason: string
{
    case Manual = "manual";
    case Failing = "failing";
}
