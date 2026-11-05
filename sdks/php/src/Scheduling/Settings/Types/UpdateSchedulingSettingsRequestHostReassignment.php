<?php

namespace Coss\Scheduling\Settings\Types;

enum UpdateSchedulingSettingsRequestHostReassignment: string
{
    case Off = "off";
    case Eligible = "eligible";
}
