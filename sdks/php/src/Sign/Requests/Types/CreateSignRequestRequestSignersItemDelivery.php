<?php

namespace Coss\Sign\Requests\Types;

enum CreateSignRequestRequestSignersItemDelivery: string
{
    case Embedded = "embedded";
    case Email = "email";
}
