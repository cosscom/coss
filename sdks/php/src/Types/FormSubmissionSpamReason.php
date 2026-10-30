<?php

namespace Coss\Types;

enum FormSubmissionSpamReason: string
{
    case Honeypot = "honeypot";
    case RiskBlock = "risk_block";
    case RiskReview = "risk_review";
    case Content = "content";
}
