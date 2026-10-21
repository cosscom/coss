<?php

namespace Coss\Email\Contacts\Types;

enum ListContactsRequestStatus: string
{
    case Subscribed = "subscribed";
    case Unsubscribed = "unsubscribed";
    case Pending = "pending";
}
