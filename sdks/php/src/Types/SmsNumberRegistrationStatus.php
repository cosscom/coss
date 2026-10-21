<?php

namespace Coss\Types;

enum SmsNumberRegistrationStatus: string
{
    case Draft = "draft";
    case Submitted = "submitted";
    case InReview = "in_review";
    case Approved = "approved";
    case Rejected = "rejected";
    case Failed = "failed";
}
