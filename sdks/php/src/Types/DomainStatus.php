<?php

namespace Coss\Types;

enum DomainStatus: string
{
    case Pending = "pending";
    case Verified = "verified";
    case TemporaryFailure = "temporary_failure";
    case Failed = "failed";
    case Deleting = "deleting";
}
