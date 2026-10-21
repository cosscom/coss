<?php

namespace Coss\Types;

enum DmarcReportRecordSpf: string
{
    case Pass = "pass";
    case Fail = "fail";
}
