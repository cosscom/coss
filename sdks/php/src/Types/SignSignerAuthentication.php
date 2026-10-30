<?php

namespace Coss\Types;

enum SignSignerAuthentication: string
{
    case EmailLink = "email_link";
    case CustomerAsserted = "customer_asserted";
}
