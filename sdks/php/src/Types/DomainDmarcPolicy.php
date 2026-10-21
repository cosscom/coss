<?php

namespace Coss\Types;

enum DomainDmarcPolicy: string
{
    case None = "none";
    case Quarantine = "quarantine";
    case Reject = "reject";
}
