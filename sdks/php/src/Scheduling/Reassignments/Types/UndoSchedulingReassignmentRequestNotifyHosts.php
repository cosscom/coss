<?php

namespace Coss\Scheduling\Reassignments\Types;

enum UndoSchedulingReassignmentRequestNotifyHosts: string
{
    case Digest = "digest";
    case Each = "each";
    case None = "none";
}
