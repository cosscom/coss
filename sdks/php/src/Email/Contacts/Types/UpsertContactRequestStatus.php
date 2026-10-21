<?php

namespace Coss\Email\Contacts\Types;

enum UpsertContactRequestStatus: string
{
    case Subscribed = "subscribed";
    case Unsubscribed = "unsubscribed";
}
