<?php

namespace Coss\Types;

enum InboxMessageSummaryDirection: string
{
    case Inbound = "inbound";
    case Outbound = "outbound";
}
