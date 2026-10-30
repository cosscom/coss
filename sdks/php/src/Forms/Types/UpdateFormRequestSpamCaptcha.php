<?php

namespace Coss\Forms\Types;

enum UpdateFormRequestSpamCaptcha: string
{
    case Off = "off";
    case Required = "required";
}
