<?php

namespace Coss\Sign\Templates\Types;

enum CreateSignRequestFromTemplateRequestSigningOrder: string
{
    case Parallel = "parallel";
    case Sequential = "sequential";
}
