<?php

namespace Coss\Types;

enum TopicDefaultSubscription: string
{
    case OptIn = "opt_in";
    case OptOut = "opt_out";
}
