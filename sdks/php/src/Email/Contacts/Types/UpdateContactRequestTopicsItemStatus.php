<?php

namespace Coss\Email\Contacts\Types;

enum UpdateContactRequestTopicsItemStatus: string
{
    case OptedIn = "opted_in";
    case OptedOut = "opted_out";
}
