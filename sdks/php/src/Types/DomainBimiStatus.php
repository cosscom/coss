<?php

namespace Coss\Types;

enum DomainBimiStatus: string
{
    case NotChecked = "not_checked";
    case Missing = "missing";
    case Invalid = "invalid";
    case Configured = "configured";
}
