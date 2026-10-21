<?php

namespace Coss\Types;

enum AuditActorType: string
{
    case User = "user";
    case ApiKey = "api_key";
    case System = "system";
}
