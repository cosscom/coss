<?php

namespace Coss\Types;

enum RiskEmailCheckDegradedItem: string
{
    case EmailDns = "email_dns";
    case DomainAge = "domain_age";
}
