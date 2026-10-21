<?php

namespace Coss\Types;

enum EmailWebhookEventDataBounceType: string
{
    case Permanent = "permanent";
    case Transient = "transient";
    case Undetermined = "undetermined";
}
