<?php

namespace Coss\Types;

enum SuppressionReason: string
{
    case Bounce = "bounce";
    case Complaint = "complaint";
    case Manual = "manual";
    case Import = "import";
    case Unsubscribe = "unsubscribe";
}
