<?php

namespace Coss\Types;

enum SignTemplateFieldsItemType: string
{
    case Signature = "signature";
    case Initials = "initials";
    case DateSigned = "date_signed";
    case Name = "name";
    case Email = "email";
    case Text = "text";
    case Checkbox = "checkbox";
}
