<?php

namespace Coss\Types;

enum DomainDmarcChecksItemId: string
{
    case Coverage = "coverage";
    case Recent = "recent";
    case Complete = "complete";
    case TimeAtPolicy = "time_at_policy";
    case CossPassRate = "coss_pass_rate";
    case PassRate = "pass_rate";
    case Sources = "sources";
}
