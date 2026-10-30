<?php

namespace Coss\Types;

enum FormSpamOnReview: string
{
    case Deliver = "deliver";
    case Hold = "hold";
}
