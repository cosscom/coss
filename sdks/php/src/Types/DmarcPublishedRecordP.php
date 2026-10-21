<?php

namespace Coss\Types;

enum DmarcPublishedRecordP: string
{
    case None = "none";
    case Quarantine = "quarantine";
    case Reject = "reject";
}
