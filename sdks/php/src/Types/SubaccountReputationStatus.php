<?php

namespace Coss\Types;

enum SubaccountReputationStatus: string
{
    case Good = "good";
    case Warning = "warning";
    case Paused = "paused";
}
