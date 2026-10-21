<?php

namespace Coss\Billing\Types;

enum UsageBillingRequestMeter: string
{
    case EmailRecipients = "email.recipients";
    case EmailDedicatedIp = "email.dedicated_ip";
    case SmsSegments = "sms.segments";
    case VideoParticipantMinutes = "video.participant_minutes";
    case SchedulingBookings = "scheduling.bookings";
}
