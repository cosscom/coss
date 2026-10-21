<?php

namespace Coss\Types;

enum RiskOutcome: string
{
    case Legitimate = "legitimate";
    case Fraud = "fraud";
    case Abuse = "abuse";
}
