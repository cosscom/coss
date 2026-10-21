<?php

namespace Coss\Types;

enum RiskAssessmentReviewStatus: string
{
    case Open = "open";
    case Resolved = "resolved";
}
