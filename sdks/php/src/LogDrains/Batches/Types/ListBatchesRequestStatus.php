<?php

namespace Coss\LogDrains\Batches\Types;

enum ListBatchesRequestStatus: string
{
    case Pending = "pending";
    case Succeeded = "succeeded";
    case Failed = "failed";
}
