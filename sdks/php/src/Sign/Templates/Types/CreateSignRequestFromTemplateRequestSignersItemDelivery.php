<?php

namespace Coss\Sign\Templates\Types;

enum CreateSignRequestFromTemplateRequestSignersItemDelivery: string
{
    case Embedded = "embedded";
    case Email = "email";
}
