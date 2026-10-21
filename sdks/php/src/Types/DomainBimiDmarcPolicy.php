<?php

namespace Coss\Types;

enum DomainBimiDmarcPolicy: string
{
    case None = "none";
    case Quarantine = "quarantine";
    case Reject = "reject";
}
