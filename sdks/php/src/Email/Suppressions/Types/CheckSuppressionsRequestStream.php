<?php

namespace Coss\Email\Suppressions\Types;

enum CheckSuppressionsRequestStream: string
{
    case Transactional = "transactional";
    case Marketing = "marketing";
}
