<?php

namespace Coss\Types;

enum DmarcReportRecordDkim: string
{
    case Pass = "pass";
    case Fail = "fail";
}
