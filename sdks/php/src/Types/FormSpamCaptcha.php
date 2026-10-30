<?php

namespace Coss\Types;

enum FormSpamCaptcha: string
{
    case Off = "off";
    case Required = "required";
}
