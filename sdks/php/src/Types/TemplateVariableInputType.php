<?php

namespace Coss\Types;

enum TemplateVariableInputType: string
{
    case String = "string";
    case Number = "number";
    case Boolean = "boolean";
    case List_ = "list";
}
