<?php

namespace Coss\Types;

enum TemplateVariableInputFieldsItemType: string
{
    case String = "string";
    case Number = "number";
    case Boolean = "boolean";
}
