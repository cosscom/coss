<?php

namespace Coss\Types;

enum EnvironmentApiKeyAccess: string
{
    case Full = "full";
    case Restricted = "restricted";
}
