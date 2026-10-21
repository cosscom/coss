<?php

namespace Coss\Types;

enum ReputationStatus: string
{
    case Good = "good";
    case Warning = "warning";
    case Suspended = "suspended";
}
