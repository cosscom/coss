<?php

namespace Coss\Risk\LimitBuckets\Types;

enum UpdateRiskLimitBucketRequestOnFailure: string
{
    case Allow = "allow";
    case Deny = "deny";
}
