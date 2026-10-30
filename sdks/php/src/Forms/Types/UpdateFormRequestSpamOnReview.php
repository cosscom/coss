<?php

namespace Coss\Forms\Types;

enum UpdateFormRequestSpamOnReview: string
{
    case Deliver = "deliver";
    case Hold = "hold";
}
