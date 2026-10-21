<?php

namespace Coss\Types;

enum RiskEmailCheckDeliverability: string
{
    case Deliverable = "deliverable";
    case Undeliverable = "undeliverable";
    case Unknown = "unknown";
}
