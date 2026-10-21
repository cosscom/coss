<?php

namespace Coss\Types;

enum SmsEncoding: string
{
    case Gsm7 = "gsm7";
    case Ucs2 = "ucs2";
}
