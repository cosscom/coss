<?php

namespace Coss\Types;

enum SignEventType: string
{
    case Created = "created";
    case Sent = "sent";
    case Notified = "notified";
    case Viewed = "viewed";
    case Consented = "consented";
    case Signed = "signed";
    case Declined = "declined";
    case Reminded = "reminded";
    case Canceled = "canceled";
    case Expired = "expired";
    case Completed = "completed";
    case Sealed = "sealed";
}
