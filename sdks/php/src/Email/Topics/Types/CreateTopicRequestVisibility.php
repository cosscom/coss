<?php

namespace Coss\Email\Topics\Types;

enum CreateTopicRequestVisibility: string
{
    case Public_ = "public";
    case Private_ = "private";
}
