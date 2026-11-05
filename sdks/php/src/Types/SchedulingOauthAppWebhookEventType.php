<?php

namespace Coss\Types;

enum SchedulingOauthAppWebhookEventType: string
{
    case SchedulingOauthAppFailing = "scheduling.oauth_app.failing";
    case SchedulingOauthAppRestored = "scheduling.oauth_app.restored";
}
