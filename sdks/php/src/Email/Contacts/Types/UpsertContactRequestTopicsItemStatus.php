<?php

namespace Coss\Email\Contacts\Types;

enum UpsertContactRequestTopicsItemStatus: string
{
    case OptedIn = "opted_in";
    case OptedOut = "opted_out";
}
