<?php

namespace Coss\Types;

enum SchedulingOauthAppProvider: string
{
    case Google = "google";
    case Microsoft = "microsoft";
    case Zoom = "zoom";
}
