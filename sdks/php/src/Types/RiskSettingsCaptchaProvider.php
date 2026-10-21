<?php

namespace Coss\Types;

enum RiskSettingsCaptchaProvider: string
{
    case Turnstile = "turnstile";
    case Hcaptcha = "hcaptcha";
}
