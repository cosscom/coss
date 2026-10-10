/**
 * Sends a test email through the SDK.
 *
 *   COSS_API_KEY=coss_test_… COSS_BASE_URL=http://localhost:3001 bun packages/sdk/examples/send-email.ts
 *
 * With a sandbox (`coss_test_…`) key nothing is delivered; the email is recorded with `sandbox: true`.
 */
import { Coss } from "../src/index.ts";

const coss = new Coss({
  apiKey: process.env.COSS_API_KEY,
  baseUrl: process.env.COSS_BASE_URL,
});

const { data, error } = await coss.email.send({
  from: "Acme <onboarding@example.com>",
  to: "delivered@example.com",
  subject: "Hello from COSS",
  html: "<p>It works! This email was sent with the <strong>coss</strong> SDK.</p>",
  text: "It works! This email was sent with the coss SDK.",
  tags: [{ name: "source", value: "sdk-example" }],
});

if (error) {
  console.error({ data, error });
  process.exit(1);
}
console.log({ data, error });
