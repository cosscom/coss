<?php

namespace Coss\Types;

enum EmailContentStorageMode: string
{
    case Store = "store";
    case Discard = "discard";
}
