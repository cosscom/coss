<?php

namespace Coss\Types;

enum ReceivedEmailVerdictsDkim: string
{
    case Pass = "pass";
    case Fail = "fail";
    case Gray = "gray";
    case ProcessingFailed = "processing_failed";
}
