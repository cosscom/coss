<?php

namespace Coss\Types;

enum TrackingDomainRecordStatus: string
{
    case Verified = "verified";
    case Missing = "missing";
    case Mismatch = "mismatch";
    case NotChecked = "not_checked";
}
