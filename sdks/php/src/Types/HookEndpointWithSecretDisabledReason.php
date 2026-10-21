<?php

namespace Coss\Types;

enum HookEndpointWithSecretDisabledReason: string
{
    case Manual = "manual";
    case Failing = "failing";
}
