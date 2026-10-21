<?php

namespace Coss\Types;

enum ReceivedSmsKeyword: string
{
    case Stop = "stop";
    case Start = "start";
    case Help = "help";
}
