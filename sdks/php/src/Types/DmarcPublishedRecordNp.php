<?php

namespace Coss\Types;

enum DmarcPublishedRecordNp: string
{
    case None = "none";
    case Quarantine = "quarantine";
    case Reject = "reject";
}
