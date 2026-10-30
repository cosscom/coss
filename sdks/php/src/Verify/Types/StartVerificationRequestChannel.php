<?php

namespace Coss\Verify\Types;

enum StartVerificationRequestChannel: string
{
    case Sms = "sms";
    case Email = "email";
}
