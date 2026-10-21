<?php

namespace Coss\Types;

enum LogDrainBatchStatus: string
{
    case Pending = "pending";
    case Succeeded = "succeeded";
    case Failed = "failed";
}
