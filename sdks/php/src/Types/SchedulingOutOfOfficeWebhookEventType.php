<?php

namespace Coss\Types;

enum SchedulingOutOfOfficeWebhookEventType: string
{
    case SchedulingOutOfOfficeCreated = "scheduling.out_of_office.created";
    case SchedulingOutOfOfficeUpdated = "scheduling.out_of_office.updated";
    case SchedulingOutOfOfficeDeleted = "scheduling.out_of_office.deleted";
    case SchedulingOutOfOfficeStarted = "scheduling.out_of_office.started";
    case SchedulingOutOfOfficeEnded = "scheduling.out_of_office.ended";
}
