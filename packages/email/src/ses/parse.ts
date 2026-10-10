/**
 * Normalizes what SES publishes (via SNS with raw delivery, an SNS envelope, or EventBridge) into
 * `ProviderEvent`s and tenant status changes. Pure: no I/O.
 */

import type { ProviderEvent } from "../provider.ts";
import type { EmailEventDataOutput } from "../schemas.ts";
import { EMAIL_ID_TAG } from "./provider.ts";

export type TenantStatusEvent = {
  /** From the tenant ARN `arn:aws:ses:<region>:<account>:tenant/<name>/<id>`. */
  tenantName: string;
  status: "enabled" | "disabled" | "reinstated";
  cause: string | null;
  occurredAt: Date;
};

export type ParsedSesMessage =
  | { kind: "events"; events: ProviderEvent[] }
  | { kind: "tenant_status"; status: TenantStatusEvent }
  | { kind: "ignored"; reason: string };

type Json = Record<string, unknown>;

const SUPPRESSED_SUBTYPES = new Set([
  "Suppressed",
  "OnAccountSuppressionList",
  "OnTenantSuppressionList",
]);

function object(value: unknown): Json | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Json)
    : null;
}

function string(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function date(value: unknown, fallback: Date): Date {
  const parsed = typeof value === "string" ? new Date(value) : null;
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed : fallback;
}

function list(value: unknown): Json[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item): Json[] => {
    const entry = object(item);
    return entry ? [entry] : [];
  });
}

const BOUNCE_TYPE = {
  Permanent: "permanent",
  Transient: "transient",
  Undetermined: "undetermined",
} as const;

/** One SES event record (`eventType` + `mail` + the type's object) as provider events. */
export function parseSesEvent(record: Json): ParsedSesMessage {
  const type = string(record.eventType) ?? string(record.notificationType);
  const mail = object(record.mail);
  if (!type || !mail) return { kind: "ignored", reason: "not an SES event record" };
  const tags = object(mail.tags);
  const emailTag = tags?.[EMAIL_ID_TAG];
  const emailId = Array.isArray(emailTag) ? string(emailTag[0]) : null;
  const providerMessageId = string(mail.messageId);
  const mailTime = date(mail.timestamp, new Date());
  const base = { provider: "ses", providerEventType: type, emailId, providerMessageId };

  const perRecipient = (
    recipients: Json[],
    build: (recipient: Json) => Pick<ProviderEvent, "type" | "data" | "suppressed">,
    occurredAt: Date,
    sourceId: string,
  ): ParsedSesMessage => ({
    kind: "events",
    events: recipients.flatMap((recipient) => {
      const address = string(recipient.emailAddress);
      if (!address) return [];
      return [{ ...base, recipients: [address], occurredAt, sourceId, ...build(recipient) }];
    }),
  });

  switch (type) {
    case "Send":
      return {
        kind: "events",
        events: [
          {
            ...base,
            type: "email.sent",
            recipients: null,
            occurredAt: mailTime,
            sourceId: "send",
            data: {},
          },
        ],
      };
    case "Delivery": {
      const delivery = object(record.delivery) ?? {};
      const occurredAt = date(delivery.timestamp, mailTime);
      const recipients = Array.isArray(delivery.recipients)
        ? delivery.recipients.flatMap((value) => string(value) ?? [])
        : [];
      const data: EmailEventDataOutput = {
        delivery: { smtp_response: string(delivery.smtpResponse) },
      };
      return {
        kind: "events",
        events: [
          {
            ...base,
            type: "email.delivered",
            recipients,
            occurredAt,
            sourceId: occurredAt.toISOString(),
            data,
          },
        ],
      };
    }
    case "DeliveryDelay": {
      const delay = object(record.deliveryDelay) ?? {};
      const occurredAt = date(delay.timestamp, mailTime);
      const expiration = string(delay.expirationTime);
      return perRecipient(
        list(delay.delayedRecipients),
        (recipient) => ({
          type: "email.delivery_delayed",
          data: {
            delay: {
              type: string(delay.delayType) ?? "Undetermined",
              expires_at: expiration ? date(expiration, occurredAt).toISOString() : null,
              diagnostic_code: string(recipient.diagnosticCode),
            },
          },
        }),
        occurredAt,
        occurredAt.toISOString(),
      );
    }
    case "Bounce": {
      const bounce = object(record.bounce) ?? {};
      const occurredAt = date(bounce.timestamp, mailTime);
      const bounceType = string(bounce.bounceType) ?? "Undetermined";
      const subType = string(bounce.bounceSubType) ?? "Undetermined";
      return perRecipient(
        list(bounce.bouncedRecipients),
        (recipient) => ({
          type: "email.bounced",
          suppressed: SUPPRESSED_SUBTYPES.has(subType),
          data: {
            bounce: {
              type: BOUNCE_TYPE[bounceType as keyof typeof BOUNCE_TYPE] ?? "undetermined",
              sub_type: subType,
              diagnostic_code: string(recipient.diagnosticCode),
            },
          },
        }),
        occurredAt,
        string(bounce.feedbackId) ?? occurredAt.toISOString(),
      );
    }
    case "Complaint": {
      const complaint = object(record.complaint) ?? {};
      const occurredAt = date(complaint.timestamp, mailTime);
      return perRecipient(
        list(complaint.complainedRecipients),
        () => ({
          type: "email.complained",
          data: {
            complaint: {
              feedback_type: string(complaint.complaintFeedbackType),
              sub_type: string(complaint.complaintSubType),
            },
          },
        }),
        occurredAt,
        string(complaint.feedbackId) ?? occurredAt.toISOString(),
      );
    }
    case "Reject":
      return {
        kind: "events",
        events: [
          {
            ...base,
            type: "email.failed",
            recipients: null,
            occurredAt: mailTime,
            sourceId: "reject",
            data: {
              failure: {
                code: "rejected",
                message: "The email provider rejected the email because it contains a virus.",
              },
            },
          },
        ],
      };
    case "Rendering Failure":
      return {
        kind: "events",
        events: [
          {
            ...base,
            type: "email.failed",
            recipients: null,
            occurredAt: mailTime,
            sourceId: "rendering_failure",
            data: {
              failure: {
                code: "rendering_failure",
                message:
                  string(object(record.failure)?.errorMessage) ??
                  "The email could not be rendered.",
              },
            },
          },
        ],
      };
    default:
      return { kind: "ignored", reason: `unhandled SES event type ${type}` };
  }
}

const TENANT_STATUS = {
  ENABLED: "enabled",
  DISABLED: "disabled",
  REINSTATED: "reinstated",
} as const;

function parseEventBridge(envelope: Json): ParsedSesMessage {
  const detailType = string(envelope["detail-type"]);
  const detail = object(envelope.detail) ?? {};
  if (detailType === "Sending Status Enabled" || detailType === "Sending Status Disabled") {
    const resource = Array.isArray(envelope.resources) ? string(envelope.resources[0]) : null;
    // arn:aws:ses:<region>:<account>:tenant/<name>/<id>
    const tenantName = resource?.split(":")[5]?.split("/")[1];
    const record = object(object(detail.data)?.record) ?? {};
    const status = TENANT_STATUS[string(record.status) as keyof typeof TENANT_STATUS];
    if (!tenantName || !status) return { kind: "ignored", reason: "malformed tenant status event" };
    return {
      kind: "tenant_status",
      status: {
        tenantName,
        status,
        cause: string(record.cause),
        occurredAt: date(envelope.time, new Date()),
      },
    };
  }
  // An SES event destination on EventBridge wraps the same event record in `detail`.
  if (detail.mail) return parseSesEvent(detail);
  return { kind: "ignored", reason: `unhandled EventBridge event ${detailType}` };
}

/**
 * Parses one SQS message body. Plain-text notices (SES confirms a new event destination with
 * "Successfully validated SNS topic …") are ignored; malformed JSON throws (the message is redriven,
 * then dead-lettered).
 */
export function parseSesMessage(body: string): ParsedSesMessage {
  if (!body.trimStart().startsWith("{")) return { kind: "ignored", reason: "not JSON" };
  const message = object(JSON.parse(body));
  if (!message) return { kind: "ignored", reason: "not a JSON object" };
  if (message.Type === "Notification" && typeof message.Message === "string") {
    // An SNS envelope (raw message delivery off).
    return parseSesMessage(message.Message);
  }
  if (message.Type === "SubscriptionConfirmation") {
    return { kind: "ignored", reason: "SNS subscription confirmation" };
  }
  if (message.source === "aws.ses" && "detail-type" in message) return parseEventBridge(message);
  return parseSesEvent(message);
}
