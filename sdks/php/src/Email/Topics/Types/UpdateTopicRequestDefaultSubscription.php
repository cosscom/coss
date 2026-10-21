<?php

namespace Coss\Email\Topics\Types;

enum UpdateTopicRequestDefaultSubscription: string
{
    case OptIn = "opt_in";
    case OptOut = "opt_out";
}
