<?php

namespace Coss\Types;

enum RiskIpCheckHostingKind: string
{
    case Cloud = "cloud";
    case Hosting = "hosting";
    case Vpn = "vpn";
}
