<?php

namespace Coss\Types;

enum DmarcReportRecordDisposition: string
{
    case None = "none";
    case Quarantine = "quarantine";
    case Reject = "reject";
}
