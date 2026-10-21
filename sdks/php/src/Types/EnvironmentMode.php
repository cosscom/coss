<?php

namespace Coss\Types;

enum EnvironmentMode: string
{
    case Live = "live";
    case Sandbox = "sandbox";
}
