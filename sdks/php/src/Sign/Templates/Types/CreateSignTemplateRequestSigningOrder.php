<?php

namespace Coss\Sign\Templates\Types;

enum CreateSignTemplateRequestSigningOrder: string
{
    case Parallel = "parallel";
    case Sequential = "sequential";
}
