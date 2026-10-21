<?php

namespace Coss\Types;

enum SendEmailRequestStream: string
{
    case Transactional = "transactional";
    case Marketing = "marketing";
}
