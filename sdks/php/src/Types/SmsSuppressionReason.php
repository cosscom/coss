<?php

namespace Coss\Types;

enum SmsSuppressionReason: string
{
    case OptOut = "opt_out";
    case Manual = "manual";
    case InvalidNumber = "invalid_number";
}
