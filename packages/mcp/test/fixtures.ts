import type { Email, EmailEvent, EmailRecipient, Sms, SmsEvent } from "coss";

export const NOW = new Date("2026-10-15T12:00:00.000Z");

export function recipient(
  address: string,
  status: EmailRecipient["status"],
  type: EmailRecipient["type"] = "to",
): EmailRecipient {
  return { address, type, status, last_event_at: null };
}

export function email(overrides: Partial<Email> = {}): Email {
  return {
    object: "email",
    id: "email_01k7c8m4q2f3e9v6t5r1n0p8yz",
    from: "Acme <hello@acme.com>",
    to: ["ada@example.com"],
    cc: [],
    bcc: [],
    reply_to: [],
    subject: "Welcome",
    html: "<p>Hi</p>",
    text: null,
    headers: {},
    tags: [],
    category: null,
    stream: "transactional",
    status: "sent",
    failure: null,
    recipients: [recipient("ada@example.com", "delivered")],
    attachments: [],
    sandbox: false,
    tracking: {
      opens: false,
      clicks: false,
      unsubscribe: false,
      open_count: 0,
      first_opened_at: null,
      last_opened_at: null,
      click_count: 0,
      first_clicked_at: null,
      last_clicked_at: null,
    },
    created_at: "2026-10-15T11:59:00.000Z",
    sent_at: "2026-10-15T11:59:01.000Z",
    scheduled_at: null,
    batch_id: null,
    template: null,
    broadcast_id: null,
    content_storage: { mode: "store", discarded_at: null },
    ...overrides,
  };
}

let sequence = 0;

export function event(
  type: EmailEvent["type"],
  recipientAddress: string | null,
  data: EmailEvent["data"] = {},
): EmailEvent {
  sequence += 1;
  return {
    object: "email_event",
    id: `evt_${sequence}`,
    email_id: "email_01k7c8m4q2f3e9v6t5r1n0p8yz",
    type,
    recipient: recipientAddress,
    occurred_at: "2026-10-15T11:59:02.000Z",
    data,
  };
}

export function sms(overrides: Partial<Sms> = {}): Sms {
  return {
    object: "sms",
    id: "sms_01k7c8m4q2f3e9v6t5r1n0p8yz",
    from: "+14155550123",
    to: "+15005550006",
    body: "Your Acme code is 482913",
    status: "delivered",
    segments: 1,
    encoding: "gsm7",
    country: "US",
    tags: [],
    failure: null,
    sandbox: false,
    scheduled_at: null,
    sent_at: "2026-10-15T11:59:01.000Z",
    delivered_at: "2026-10-15T11:59:03.000Z",
    created_at: "2026-10-15T11:59:00.000Z",
    ...overrides,
  };
}

export function smsEvent(type: SmsEvent["type"], data: SmsEvent["data"] = {}): SmsEvent {
  sequence += 1;
  return {
    object: "sms_event",
    id: `smsevt_${sequence}`,
    sms_id: "sms_01k7c8m4q2f3e9v6t5r1n0p8yz",
    type,
    occurred_at: "2026-10-15T11:59:02.000Z",
    data,
  };
}
