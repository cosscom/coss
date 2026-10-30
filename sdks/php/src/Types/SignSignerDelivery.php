<?php

namespace Coss\Types;

enum SignSignerDelivery: string
{
    case Embedded = "embedded";
    case Email = "email";
}
