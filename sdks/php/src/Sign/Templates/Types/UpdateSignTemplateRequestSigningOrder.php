<?php

namespace Coss\Sign\Templates\Types;

enum UpdateSignTemplateRequestSigningOrder: string
{
    case Parallel = "parallel";
    case Sequential = "sequential";
}
