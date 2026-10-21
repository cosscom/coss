<?php

namespace Coss\Email\Contacts\Types;

enum ExportContactsRequestStatus: string
{
    case Subscribed = "subscribed";
    case Unsubscribed = "unsubscribed";
    case Pending = "pending";
}
