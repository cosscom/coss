<?php

namespace Coss\Email\Contacts\Types;

enum UpdateContactTopicsRequestTopicsItemStatus: string
{
    case OptedIn = "opted_in";
    case OptedOut = "opted_out";
}
