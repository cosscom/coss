import type {
  MobileReceivedSms,
  MobileSms,
  MobileSmsEvent,
  MobileSmsSummary,
} from "@coss/companion";
import type { ReceivedSmsObjectOutput, SmsEventOutput, SmsObjectOutput } from "@coss/sms/schemas";

const PREVIEW_LENGTH = 120;

export function toMobileSmsSummary(sms: SmsObjectOutput): MobileSmsSummary {
  return {
    id: sms.id,
    from: sms.from,
    to: sms.to,
    preview: sms.body.length > PREVIEW_LENGTH ? `${sms.body.slice(0, PREVIEW_LENGTH)}…` : sms.body,
    status: sms.status,
    segments: sms.segments,
    sandbox: sms.sandbox,
    created_at: sms.created_at,
    scheduled_at: sms.scheduled_at,
  };
}

export function toMobileSms(sms: SmsObjectOutput): MobileSms {
  return {
    id: sms.id,
    from: sms.from,
    to: sms.to,
    body: sms.body,
    status: sms.status,
    segments: sms.segments,
    encoding: sms.encoding,
    country: sms.country,
    tags: sms.tags,
    failure: sms.failure,
    sandbox: sms.sandbox,
    created_at: sms.created_at,
    scheduled_at: sms.scheduled_at,
    sent_at: sms.sent_at,
    delivered_at: sms.delivered_at,
  };
}

// The dashboard's events table (sms/[smsId]/page.tsx).
export function toMobileSmsEvent(event: SmsEventOutput): MobileSmsEvent {
  const { failure, suppression, provider_error_code } = event.data;
  const detail =
    (failure?.message ?? (suppression ? `Suppressed (${suppression.reason})` : "")) +
    (provider_error_code ? ` (error ${provider_error_code})` : "");
  return { id: event.id, type: event.type, occurred_at: event.occurred_at, detail: detail.trim() };
}

export function toMobileReceivedSms(message: ReceivedSmsObjectOutput): MobileReceivedSms {
  return {
    id: message.id,
    from: message.from,
    to: message.to,
    body: message.body,
    segments: message.segments,
    keyword: message.keyword,
    sandbox: message.sandbox,
    created_at: message.created_at,
  };
}
