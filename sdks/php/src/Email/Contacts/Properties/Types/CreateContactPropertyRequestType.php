<?php

namespace Coss\Email\Contacts\Properties\Types;

enum CreateContactPropertyRequestType: string
{
    case String = "string";
    case Number = "number";
    case Boolean = "boolean";
    case Date = "date";
}
