<?php

namespace Coss\Types;

enum SmsNumberStatus: string
{
    case Pending = "pending";
    case Active = "active";
    case Releasing = "releasing";
}
