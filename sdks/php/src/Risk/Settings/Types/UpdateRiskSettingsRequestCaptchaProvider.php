<?php

namespace Coss\Risk\Settings\Types;

enum UpdateRiskSettingsRequestCaptchaProvider: string
{
    case Turnstile = "turnstile";
    case Hcaptcha = "hcaptcha";
}
