<?php

namespace Coss\Types;

enum ReceivedEmailStatus: string
{
    case Received = "received";
    case Blocked = "blocked";
}
