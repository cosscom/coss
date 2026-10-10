import type { Environment } from "@coss/tenancy";
import type { EmailProvider, OutboundEmail } from "../src/provider.ts";
import {
  SendEmailRequest,
  type SendEmailRequestInput,
  type SendEmailRequestOutput,
} from "../src/schemas.ts";
import type { SendEnvironment } from "../src/service.ts";
import { createVerifiedDomain } from "../src/testing.ts";

export function sendEnvironment(env: Environment): SendEnvironment {
  return {
    organizationId: env.organizationId,
    projectId: env.projectId,
    environmentId: env.id,
    mode: env.mode,
  };
}

export function params(overrides: Partial<SendEmailRequestInput> = {}): SendEmailRequestOutput {
  return SendEmailRequest.parse({
    from: "Acme <hello@acme.com>",
    to: "user@example.com",
    subject: "Welcome",
    text: "Hello!",
    ...overrides,
  });
}

/** A From address on a new verified domain of the organization, as live sends require. */
export async function verifiedFrom(organizationId: string): Promise<string> {
  const domain = await createVerifiedDomain(organizationId);
  return `Acme <hello@${domain.name}>`;
}

/** A provider whose sends block until `release()`; `called` resolves on the first send. */
export function gatedProvider(name = "gated") {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let markCalled!: () => void;
  const called = new Promise<void>((resolve) => {
    markCalled = resolve;
  });
  const sent: OutboundEmail[] = [];
  const provider: EmailProvider = {
    name,
    async send(message) {
      sent.push(message);
      markCalled();
      await gate;
      return { providerMessageId: `${name}_${sent.length}` };
    },
  };
  return { provider, sent, called, release };
}
