<?php

namespace Coss\Sign\Templates\Types;

enum CreateSignTemplateRequestFieldsItemAnchorType: string
{
    case Signature = "signature";
    case Initials = "initials";
    case DateSigned = "date_signed";
    case Name = "name";
    case Email = "email";
    case Text = "text";
    case Checkbox = "checkbox";
}
