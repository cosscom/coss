<?php

namespace Coss\Types;

enum DomainMailFromStatus: string
{
    case Pending = "pending";
    case Success = "success";
    case TemporaryFailure = "temporary_failure";
    case Failed = "failed";
}
