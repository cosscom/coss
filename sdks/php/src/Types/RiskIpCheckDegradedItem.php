<?php

namespace Coss\Types;

enum RiskIpCheckDegradedItem: string
{
    case IpData = "ip_data";
    case IpPrivacy = "ip_privacy";
}
