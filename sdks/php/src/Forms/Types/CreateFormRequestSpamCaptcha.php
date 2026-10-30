<?php

namespace Coss\Forms\Types;

enum CreateFormRequestSpamCaptcha: string
{
    case Off = "off";
    case Required = "required";
}
