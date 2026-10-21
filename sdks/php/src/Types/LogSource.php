<?php

namespace Coss\Types;

enum LogSource: string
{
    case Api = "api";
    case Email = "email";
    case Webhook = "webhook";
    case Risk = "risk";
    case Smtp = "smtp";
    case Sms = "sms";
}
