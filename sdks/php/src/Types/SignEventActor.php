<?php

namespace Coss\Types;

enum SignEventActor: string
{
    case ApiKey = "api_key";
    case Signer = "signer";
    case Dashboard = "dashboard";
    case System = "system";
}
