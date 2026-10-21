<?php

namespace Coss\Risk\Assessments\Types;

enum ListAssessmentsRequestReviewStatus: string
{
    case Open = "open";
    case Resolved = "resolved";
}
