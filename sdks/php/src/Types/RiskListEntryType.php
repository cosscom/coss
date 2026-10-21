<?php

namespace Coss\Types;

enum RiskListEntryType: string
{
    case Email = "email";
    case Domain = "domain";
    case Ip = "ip";
    case Asn = "asn";
    case Country = "country";
    case User = "user";
}
