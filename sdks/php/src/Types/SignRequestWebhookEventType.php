<?php

namespace Coss\Types;

enum SignRequestWebhookEventType: string
{
    case SignRequestSent = "sign_request.sent";
    case SignRequestViewed = "sign_request.viewed";
    case SignRequestSignerSigned = "sign_request.signer_signed";
    case SignRequestDeclined = "sign_request.declined";
    case SignRequestCompleted = "sign_request.completed";
    case SignRequestCanceled = "sign_request.canceled";
    case SignRequestExpired = "sign_request.expired";
}
