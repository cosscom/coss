<?php

namespace Coss\Scheduling\Reassignments\Types;

enum CreateSchedulingReassignmentRequestNotifyHosts: string
{
    case Digest = "digest";
    case Each = "each";
    case None = "none";
}
