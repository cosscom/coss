import { createHash, randomUUID } from "node:crypto";
import type { EmailProvider, OutboundEmail, ProviderEvent, SendResult } from "../provider.ts";
import { parseEmailAddress } from "../schemas.ts";
import { FAKE_DEDICATED_IP } from "./fake-dedicated-ips.ts";

const MAX_KEPT = 100;

/** Same addresses as the SES mailbox simulator, so tests behave alike in sandbox and live. */
export const SIMULATOR_DOMAIN = "simulator.amazonses.com";

/** Unique lower-cased bare addresses, in to → cc → bcc order. */
export function uniqueRecipients(message: Pick<OutboundEmail, "to" | "cc" | "bcc">): string[] {
  const addresses = [...message.to, ...message.cc, ...message.bcc].map((value) =>
    parseEmailAddress(value).address.toLowerCase(),
  );
  return [...new Set(addresses)];
}

/**
 * The delivery events SES would publish for this message, with `success@`, `bounce@`,
 * `complaint@` and `ooto@simulator.amazonses.com` behaving like the SES mailbox simulator. Every
 * other address is delivered. `suppressionlist@` simulates an address on the tenant's suppression
 * list (real SES treats it as a plain hard bounce under tenant-level suppression).
 */
export function simulatedEvents(
  message: OutboundEmail,
  providerMessageId: string,
  now: Date = new Date(),
): ProviderEvent[] {
  const common = {
    provider: "fake",
    emailId: message.emailId,
    providerMessageId,
    sourceId: providerMessageId,
  };
  // Strictly increasing timestamps keep the simulated events in a stable order.
  let tick = 0;
  const base = () => ({ ...common, occurredAt: new Date(now.getTime() + tick++) });
  const events: ProviderEvent[] = [
    { ...base(), providerEventType: "Send", type: "email.sent", recipients: null, data: {} },
  ];
  const delivered = (recipient: string): ProviderEvent => ({
    ...base(),
    providerEventType: "Delivery",
    type: "email.delivered",
    recipients: [recipient],
    data: { delivery: { smtp_response: "250 2.6.0 Message received" } },
    ...(message.dedicatedPool ? { sendingIp: FAKE_DEDICATED_IP } : {}),
  });
  for (const recipient of uniqueRecipients(message)) {
    const at = recipient.lastIndexOf("@");
    const local = recipient.slice(0, at);
    if (recipient.slice(at + 1) !== SIMULATOR_DOMAIN) {
      events.push(delivered(recipient));
      continue;
    }
    switch (local) {
      case "bounce":
        events.push({
          ...base(),
          providerEventType: "Bounce",
          type: "email.bounced",
          recipients: [recipient],
          data: {
            bounce: {
              type: "permanent",
              sub_type: "General",
              diagnostic_code: "smtp; 550 5.1.1 user unknown",
            },
          },
        });
        break;
      case "suppressionlist":
        events.push({
          ...base(),
          providerEventType: "Bounce",
          type: "email.bounced",
          recipients: [recipient],
          suppressed: true,
          data: {
            bounce: {
              type: "permanent",
              sub_type: "OnTenantSuppressionList",
              diagnostic_code: null,
            },
          },
        });
        break;
      case "complaint":
        events.push(delivered(recipient), {
          ...base(),
          providerEventType: "Complaint",
          type: "email.complained",
          recipients: [recipient],
          data: { complaint: { feedback_type: "abuse", sub_type: null } },
        });
        break;
      default:
        events.push(delivered(recipient));
    }
  }
  return events;
}

/**
 * Accepts everything and delivers nothing. Used by every sandbox environment and by live ones
 * until a real provider is configured. Reports the events SES would (see `simulatedEvents`) and
 * keeps the last 100 messages for tests and debugging.
 */
/** A message the fake provider accepted, with attachment digests instead of their bytes. */
export type FakeSentEmail = Omit<OutboundEmail, "attachments"> & {
  attachments: {
    filename: string;
    contentType: string;
    contentId: string | null;
    size: number;
    sha256: string;
  }[];
};

export class FakeEmailProvider implements EmailProvider {
  readonly name = "fake";
  /**
   * Accepted messages, oldest first (bounded). Attachments are kept as digests so a long-running
   * dev server never holds up to 100 × 25 MB of content.
   */
  readonly sent: FakeSentEmail[] = [];
  readonly #log: boolean;
  readonly #fail?: (message: OutboundEmail) => boolean;

  constructor(opts: { log?: boolean; fail?: (message: OutboundEmail) => boolean } = {}) {
    this.#log = opts.log ?? true;
    this.#fail = opts.fail;
  }

  async send(message: OutboundEmail): Promise<SendResult> {
    if (this.#fail?.(message)) {
      throw new Error(`Fake provider rejected ${message.emailId}.`);
    }
    const providerMessageId = `fake_${randomUUID()}`;
    this.sent.push({
      ...message,
      attachments: message.attachments.map(({ content, ...attachment }) => ({
        ...attachment,
        size: content.byteLength,
        sha256: createHash("sha256").update(content).digest("hex"),
      })),
    });
    if (this.sent.length > MAX_KEPT) this.sent.splice(0, this.sent.length - MAX_KEPT);
    if (this.#log) {
      const recipients = uniqueRecipients(message).length;
      console.info(
        `[email:fake] ${message.emailId} accepted as ${providerMessageId}: ` +
          `${JSON.stringify(message.subject)} to ${recipients} recipient(s)` +
          (message.attachments.length ? `, ${message.attachments.length} attachment(s)` : ""),
      );
    }
    return { providerMessageId, events: simulatedEvents(message, providerMessageId) };
  }
}
