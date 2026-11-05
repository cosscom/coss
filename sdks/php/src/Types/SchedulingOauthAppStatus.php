<?php

namespace Coss\Types;

enum SchedulingOauthAppStatus: string
{
    case Active = "active";
    case Failing = "failing";
}
