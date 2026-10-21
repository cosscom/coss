<?php

namespace Coss\Types;

enum EmailRecipientType: string
{
    case To = "to";
    case Cc = "cc";
    case Bcc = "bcc";
}
