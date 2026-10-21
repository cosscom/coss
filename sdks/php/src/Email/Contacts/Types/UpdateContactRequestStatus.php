<?php

namespace Coss\Email\Contacts\Types;

enum UpdateContactRequestStatus: string
{
    case Subscribed = "subscribed";
    case Unsubscribed = "unsubscribed";
}
