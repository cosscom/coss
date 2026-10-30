<?php

namespace Coss\Types;

enum VerificationSendRoute: string
{
    case OwnNumber = "own_number";
    case SharedNumber = "shared_number";
    case Email = "email";
    case CossEmail = "coss_email";
}
