<?php

namespace Coss\Types;

enum LogLevel: string
{
    case Info = "info";
    case Warning = "warning";
    case Error = "error";
}
