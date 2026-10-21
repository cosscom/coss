<?php

namespace Coss\Risk\LimitBuckets\Types;

enum CreateRiskLimitBucketRequestOnFailure: string
{
    case Allow = "allow";
    case Deny = "deny";
}
