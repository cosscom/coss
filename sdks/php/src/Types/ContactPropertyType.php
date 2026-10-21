<?php

namespace Coss\Types;

enum ContactPropertyType: string
{
    case String = "string";
    case Number = "number";
    case Boolean = "boolean";
    case Date = "date";
}
