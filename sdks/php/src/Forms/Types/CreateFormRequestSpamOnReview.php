<?php

namespace Coss\Forms\Types;

enum CreateFormRequestSpamOnReview: string
{
    case Deliver = "deliver";
    case Hold = "hold";
}
