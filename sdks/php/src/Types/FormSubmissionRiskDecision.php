<?php

namespace Coss\Types;

enum FormSubmissionRiskDecision: string
{
    case Allow = "allow";
    case Review = "review";
    case Block = "block";
}
