<?php

namespace Coss\Types;

enum DomainDmarcNextKind: string
{
    case Publish = "publish";
    case AddReporting = "add_reporting";
    case CompleteRollout = "complete_rollout";
    case Tighten = "tighten";
}
