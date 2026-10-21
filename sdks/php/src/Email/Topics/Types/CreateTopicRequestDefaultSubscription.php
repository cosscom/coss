<?php

namespace Coss\Email\Topics\Types;

enum CreateTopicRequestDefaultSubscription: string
{
    case OptIn = "opt_in";
    case OptOut = "opt_out";
}
