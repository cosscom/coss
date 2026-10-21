<?php

namespace Coss\Types;

enum EmailSummaryStream: string
{
    case Transactional = "transactional";
    case Marketing = "marketing";
}
