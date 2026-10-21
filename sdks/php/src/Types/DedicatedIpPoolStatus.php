<?php

namespace Coss\Types;

enum DedicatedIpPoolStatus: string
{
    case NotEnabled = "not_enabled";
    case Waiting = "waiting";
    case Provisioning = "provisioning";
    case Warming = "warming";
    case Ready = "ready";
    case Releasing = "releasing";
}
