<?php

namespace Coss\Types;

enum TrackingDomainStatus: string
{
    case Pending = "pending";
    case Active = "active";
    case TemporaryFailure = "temporary_failure";
    case Failed = "failed";
    case Deleting = "deleting";
}
