<?php

namespace Coss\Types;

enum VerificationWebhookEventDataChannel: string
{
    case Sms = "sms";
    case Email = "email";
}
