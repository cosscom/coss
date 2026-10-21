<?php

namespace Coss\Types;

enum LogDrainDisabledReason: string
{
    case Manual = "manual";
    case Failing = "failing";
}
