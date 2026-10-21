<?php

namespace Coss\Types;

enum EmailStream: string
{
    case Transactional = "transactional";
    case Marketing = "marketing";
}
