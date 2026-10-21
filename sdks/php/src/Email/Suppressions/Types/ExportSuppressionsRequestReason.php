<?php

namespace Coss\Email\Suppressions\Types;

enum ExportSuppressionsRequestReason: string
{
    case Bounce = "bounce";
    case Complaint = "complaint";
    case Manual = "manual";
    case Import = "import";
    case Unsubscribe = "unsubscribe";
}
