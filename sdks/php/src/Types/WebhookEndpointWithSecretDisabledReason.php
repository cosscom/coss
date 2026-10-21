<?php

namespace Coss\Types;

enum WebhookEndpointWithSecretDisabledReason: string
{
    case Manual = "manual";
    case Failing = "failing";
}
