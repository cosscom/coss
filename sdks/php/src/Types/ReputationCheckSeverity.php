<?php

namespace Coss\Types;

enum ReputationCheckSeverity: string
{
    case Ok = "ok";
    case Warning = "warning";
    case Suspend = "suspend";
}
