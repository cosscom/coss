<?php

namespace Coss\Types;

enum SignTemplateSigningOrder: string
{
    case Parallel = "parallel";
    case Sequential = "sequential";
}
