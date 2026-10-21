<?php

namespace Coss\Types;

enum DomainDmarcNextPolicy: string
{
    case None = "none";
    case Quarantine = "quarantine";
    case Reject = "reject";
}
