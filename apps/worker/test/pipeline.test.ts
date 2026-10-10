/**
 * End to end in sandbox mode: a send produces delivery events, the outbox queues them for the
 * environment's endpoint, the worker's delivery job posts them, and the published SDK verifies
 * the signature.
 */
import { describe, expect, test } from "bun:test";
import { createEmailService, FakeEmailProvider } from "@coss/email";
import { createTestTenant } from "@coss/tenancy/testing";
import { createWebhookEndpoint, runDueWebhookDeliveries } from "@coss/webhooks";
import {
  TEST_SECRETS_KEY,
  testManagementDeps,
  testSender,
  webhookReceiver,
} from "@coss/webhooks/testing";
import { verifyWebhook, WebhookVerificationError } from "coss";

describe("sandbox send → webhook", () => {
  test("delivers signed events the SDK verifies", async () => {
    const tenant = await createTestTenant();
    const receiver = webhookReceiver();
    try {
      const { secret } = await createWebhookEndpoint(
        {
          organizationId: tenant.organization.id,
          environmentId: tenant.development.id,
          url: receiver.url,
          eventTypes: ["email.delivered", "email.bounced"],
          userId: null,
        },
        testManagementDeps,
      );
      const provider = new FakeEmailProvider({ log: false });
      const service = createEmailService({ liveProvider: provider, sandboxProvider: provider });
      const { email } = await service.send({
        environment: {
          organizationId: tenant.organization.id,
          projectId: tenant.project.id,
          environmentId: tenant.development.id,
          mode: "sandbox",
        },
        apiKeyId: null,
        params: {
          from: "Acme <hello@acme.com>",
          to: ["ok@example.com", "bounce@simulator.amazonses.com"],
          cc: [],
          bcc: [],
          reply_to: [],
          subject: "Welcome",
          html: null,
          text: "Hi",
          headers: {},
          tags: [],
        },
      });

      const attempted = await runDueWebhookDeliveries(
        { scope: { organizationIds: [tenant.organization.id] } },
        { secretsKey: TEST_SECRETS_KEY, send: testSender() },
      );
      expect(attempted).toBe(2);

      const events = await Promise.all(
        receiver.received.map((request) => verifyWebhook(request.body, request.headers, secret)),
      );
      expect(events.map((event) => [event.type, event.data.recipient]).sort()).toEqual([
        ["email.bounced", "bounce@simulator.amazonses.com"],
        ["email.delivered", "ok@example.com"],
      ]);
      expect(events.every((event) => event.data.email_id === email.id)).toBe(true);
      const [first] = receiver.received;
      if (!first) throw new Error("nothing received");
      await expect(
        verifyWebhook(first.body.replace("Welcome", "Hacked"), first.headers, secret),
      ).rejects.toThrow(WebhookVerificationError);
    } finally {
      receiver.stop();
    }
  });
});
