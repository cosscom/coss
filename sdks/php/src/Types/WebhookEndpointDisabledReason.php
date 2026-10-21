<?php

namespace Coss\Types;

enum WebhookEndpointDisabledReason: string
{
    case Manual = "manual";
    case Failing = "failing";
}
