<?php

namespace Coss\Types;

enum RiskLimitBucketOnFailure: string
{
    case Allow = "allow";
    case Deny = "deny";
}
