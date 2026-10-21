<?php

namespace Coss\Types;

enum ErrorBodyType: string
{
    case InvalidRequestError = "invalid_request_error";
    case AuthenticationError = "authentication_error";
    case PermissionError = "permission_error";
    case NotFoundError = "not_found_error";
    case IdempotencyError = "idempotency_error";
    case RateLimitError = "rate_limit_error";
    case BillingError = "billing_error";
    case ApiError = "api_error";
}
