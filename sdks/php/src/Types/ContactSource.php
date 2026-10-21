<?php

namespace Coss\Types;

enum ContactSource: string
{
    case Api = "api";
    case Dashboard = "dashboard";
    case Import = "import";
    case PreferenceCenter = "preference_center";
}
