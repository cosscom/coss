<?php

namespace Coss\Types;

enum InboxMessageDirection: string
{
    case Inbound = "inbound";
    case Outbound = "outbound";
}
