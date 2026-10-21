<?php

namespace Coss\Types;

enum ReceivedEmailVerdictsSpam: string
{
    case Pass = "pass";
    case Fail = "fail";
    case Gray = "gray";
    case ProcessingFailed = "processing_failed";
}
