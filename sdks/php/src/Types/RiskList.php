<?php

namespace Coss\Types;

enum RiskList: string
{
    case Allow = "allow";
    case Block = "block";
}
