/**
 * Sends a test email through the SDK.
 *
 *   COSS_API_KEY=coss_test_… COSS_BASE_URL=http://localhost:3001 bun packages/sdk/examples/send-email.ts
 *
 * With a sandbox (`coss_test_…`) key nothing is delivered; the email is recorded with `sandbox: true`.
 * Live (`coss_live_…`) keys must send from a verified domain: set `COSS_FROM=you@your-domain.com`.
 * `COSS_TO` overrides the recipient (e.g. `bounce@simulator.amazonses.com` to simulate a bounce).
 */
import { Coss } from "../src/index.ts";

const coss = new Coss({
  apiKey: process.env.COSS_API_KEY,
  baseUrl: process.env.COSS_BASE_URL,
});

const { data, error } = await coss.email.send({
  from: `Acme <${process.env.COSS_FROM ?? "onboarding@example.com"}>`,
  to: process.env.COSS_TO ?? "delivered@example.com",
  subject: "Hello from coss.com",
  html: "<p>It works! This email was sent with the <strong>coss</strong> SDK.</p>",
  text: "It works! This email was sent with the coss SDK.",
  tags: [{ name: "source", value: "sdk-example" }],
  attachments: [{ filename: "hello.txt", content: btoa("Hello from coss.com!") }],
});

if (error) {
  console.error({ data, error });
  process.exit(1);
}
console.log({ data, error });
