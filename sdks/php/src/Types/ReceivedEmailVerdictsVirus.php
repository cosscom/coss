<?php

namespace Coss\Types;

enum ReceivedEmailVerdictsVirus: string
{
    case Pass = "pass";
    case Fail = "fail";
    case Gray = "gray";
    case ProcessingFailed = "processing_failed";
}
