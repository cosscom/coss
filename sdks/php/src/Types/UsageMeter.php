<?php

namespace Coss\Types;

enum UsageMeter: string
{
    case EmailRecipients = "email.recipients";
    case EmailDedicatedIp = "email.dedicated_ip";
    case EmailReceived = "email.received";
    case EmailInboxes = "email.inboxes";
    case SmsSegments = "sms.segments";
    case SmsReceivedSegments = "sms.received_segments";
    case SmsNumbers = "sms.numbers";
    case SmsRegistrations = "sms.registrations";
    case SignCompletedRequests = "sign.completed_requests";
    case RiskPhoneChecks = "risk.phone_checks";
    case VerifyVerifications = "verify.verifications";
    case VerifySms = "verify.sms";
    case FormsSubmissions = "forms.submissions";
    case FormsFileUploads = "forms.file_uploads";
    case VideoParticipantMinutes = "video.participant_minutes";
    case SchedulingBookings = "scheduling.bookings";
}
