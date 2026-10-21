<?php

namespace Coss\Types;

enum DomainRecordType: string
{
    case Cname = "CNAME";
    case Mx = "MX";
    case Txt = "TXT";
}
