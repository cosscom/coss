<?php

namespace Coss\Types;

enum ContactWebhookEventType: string
{
    case ContactCreated = "contact.created";
    case ContactUpdated = "contact.updated";
    case ContactDeleted = "contact.deleted";
    case ContactUnsubscribed = "contact.unsubscribed";
    case ContactConfirmed = "contact.confirmed";
}
