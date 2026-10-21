<?php

namespace Coss\Types;

enum TemplateVariableType: string
{
    case String = "string";
    case Number = "number";
    case Boolean = "boolean";
    case List_ = "list";
}
