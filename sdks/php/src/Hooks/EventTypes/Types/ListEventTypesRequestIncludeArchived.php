<?php

namespace Coss\Hooks\EventTypes\Types;

enum ListEventTypesRequestIncludeArchived: string
{
    case True = "true";
    case False = "false";
}
