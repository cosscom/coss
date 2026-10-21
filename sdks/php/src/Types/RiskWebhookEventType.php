<?php

namespace Coss\Types;

enum RiskWebhookEventType: string
{
    case RiskAssessmentReview = "risk.assessment.review";
    case RiskAssessmentReviewed = "risk.assessment.reviewed";
}
