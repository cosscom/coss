<?php

namespace Coss\Types;

enum DomainDmarcStage: string
{
    case NotChecked = "not_checked";
    case NoRecord = "no_record";
    case Monitoring = "monitoring";
    case Quarantine = "quarantine";
    case Reject = "reject";
}
