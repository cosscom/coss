<?php

namespace Coss\Types;

enum VerificationSendChannel: string
{
    case Sms = "sms";
    case Email = "email";
}
