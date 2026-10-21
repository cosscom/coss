<?php

namespace Coss\Types;

enum RiskEmailSignalsDeliverability: string
{
    case Deliverable = "deliverable";
    case Undeliverable = "undeliverable";
    case Unknown = "unknown";
}
