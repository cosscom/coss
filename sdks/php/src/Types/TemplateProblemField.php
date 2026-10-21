<?php

namespace Coss\Types;

enum TemplateProblemField: string
{
    case Subject = "subject";
    case Html = "html";
    case Text = "text";
}
