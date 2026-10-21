<?php

namespace Coss\Email\Topics\Types;

enum UpdateTopicRequestVisibility: string
{
    case Public_ = "public";
    case Private_ = "private";
}
