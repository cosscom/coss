<?php

namespace Coss\Types;

enum SignRequestSigningOrder: string
{
    case Parallel = "parallel";
    case Sequential = "sequential";
}
