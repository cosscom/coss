<?php

namespace Coss\Types;

enum ContactStatus: string
{
    case Subscribed = "subscribed";
    case Unsubscribed = "unsubscribed";
    case Pending = "pending";
}
