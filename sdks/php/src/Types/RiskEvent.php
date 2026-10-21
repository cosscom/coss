<?php

namespace Coss\Types;

enum RiskEvent: string
{
    case Signup = "signup";
    case Login = "login";
    case Message = "message";
    case Checkout = "checkout";
    case Custom = "custom";
}
