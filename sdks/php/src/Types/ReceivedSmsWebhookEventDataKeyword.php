<?php

namespace Coss\Types;

enum ReceivedSmsWebhookEventDataKeyword: string
{
    case Stop = "stop";
    case Start = "start";
    case Help = "help";
}
