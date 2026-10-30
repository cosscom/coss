<?php

namespace Coss\Sign\Requests\Types;

enum CreateSignRequestRequestSigningOrder: string
{
    case Parallel = "parallel";
    case Sequential = "sequential";
}
