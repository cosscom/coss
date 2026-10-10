import { randomUUID } from "node:crypto";
import type { EmailProvider, OutboundEmail } from "../provider.ts";

const MAX_KEPT = 100;

/**
 * Accepts everything and delivers nothing. Used by every sandbox environment and by live ones
 * until a real provider is configured. Keeps the last 100 messages for tests and debugging.
 */
export class FakeEmailProvider implements EmailProvider {
  readonly name = "fake";
  /** Accepted messages, oldest first (bounded). */
  readonly sent: OutboundEmail[] = [];
  readonly #log: boolean;
  readonly #fail?: (message: OutboundEmail) => boolean;

  constructor(opts: { log?: boolean; fail?: (message: OutboundEmail) => boolean } = {}) {
    this.#log = opts.log ?? true;
    this.#fail = opts.fail;
  }

  async send(message: OutboundEmail): Promise<{ providerMessageId: string }> {
    if (this.#fail?.(message)) {
      throw new Error(`Fake provider rejected ${message.emailId}.`);
    }
    const providerMessageId = `fake_${randomUUID()}`;
    this.sent.push(message);
    if (this.sent.length > MAX_KEPT) this.sent.splice(0, this.sent.length - MAX_KEPT);
    if (this.#log) {
      const recipients = [...message.to, ...message.cc, ...message.bcc].length;
      console.info(
        `[email:fake] ${message.emailId} accepted as ${providerMessageId}: ` +
          `${JSON.stringify(message.subject)} to ${recipients} recipient(s)`,
      );
    }
    return { providerMessageId };
  }
}
