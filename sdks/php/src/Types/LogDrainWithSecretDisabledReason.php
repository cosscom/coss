<?php

namespace Coss\Types;

enum LogDrainWithSecretDisabledReason: string
{
    case Manual = "manual";
    case Failing = "failing";
}
