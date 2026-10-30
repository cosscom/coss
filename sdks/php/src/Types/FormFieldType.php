<?php

namespace Coss\Types;

enum FormFieldType: string
{
    case Text = "text";
    case Email = "email";
    case Textarea = "textarea";
    case Number = "number";
    case Tel = "tel";
    case Url = "url";
    case Date = "date";
    case Select = "select";
    case Radio = "radio";
    case Checkbox = "checkbox";
    case Hidden = "hidden";
    case File = "file";
}
