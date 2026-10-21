<?php

namespace Coss\Types;

enum SmsNumberKind: string
{
    case Local = "local";
    case TollFree = "toll_free";
}
