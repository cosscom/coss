<?php

namespace Coss\Types;

enum RiskDecision: string
{
    case Allow = "allow";
    case Review = "review";
    case Block = "block";
}
