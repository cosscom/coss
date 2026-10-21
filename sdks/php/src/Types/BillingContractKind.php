<?php

namespace Coss\Types;

enum BillingContractKind: string
{
    case SelfServe = "self_serve";
    case Sales = "sales";
    case Internal = "internal";
}
