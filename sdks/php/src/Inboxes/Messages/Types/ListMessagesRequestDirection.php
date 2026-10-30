<?php

namespace Coss\Inboxes\Messages\Types;

enum ListMessagesRequestDirection: string
{
    case Inbound = "inbound";
    case Outbound = "outbound";
}
