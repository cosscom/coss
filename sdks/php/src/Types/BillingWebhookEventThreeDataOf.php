<?php

namespace Coss\Types;

enum BillingWebhookEventThreeDataOf: string
{
    case Credit = "credit";
    case Allowance = "allowance";
}
