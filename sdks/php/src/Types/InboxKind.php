<?php

namespace Coss\Types;

enum InboxKind: string
{
    case Managed = "managed";
    case Domain = "domain";
}
