<?php

namespace Coss\Sign\Settings\Types;

enum UpdateSignSettingsRequestTheme: string
{
    case System = "system";
    case Light = "light";
    case Dark = "dark";
}
