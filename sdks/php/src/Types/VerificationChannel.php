<?php

namespace Coss\Types;

enum VerificationChannel: string
{
    case Sms = "sms";
    case Email = "email";
}
