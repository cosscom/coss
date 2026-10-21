<?php

namespace Coss\Types;

enum RiskIpSignalsHostingKind: string
{
    case Cloud = "cloud";
    case Hosting = "hosting";
    case Vpn = "vpn";
}
