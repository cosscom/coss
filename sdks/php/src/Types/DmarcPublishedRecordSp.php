<?php

namespace Coss\Types;

enum DmarcPublishedRecordSp: string
{
    case None = "none";
    case Quarantine = "quarantine";
    case Reject = "reject";
}
