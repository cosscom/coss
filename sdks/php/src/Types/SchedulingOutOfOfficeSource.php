<?php

namespace Coss\Types;

enum SchedulingOutOfOfficeSource: string
{
    case Api = "api";
    case Host = "host";
    case Manager = "manager";
    case Dashboard = "dashboard";
    case Holiday = "holiday";
}
