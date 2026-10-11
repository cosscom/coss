/**
 * End to end in sandbox mode: a send queues the email, its dispatch produces delivery events, the
 * outbox queues them for the environment's endpoint, the worker's delivery job posts them, and
 * the published SDK verifies the signature.
 */
import { describe, expect, test } from "bun:test";
import { createEmailService, FakeEmailProvider } from "@coss/email";
import { memoryDispatchQueue } from "@coss/email/testing";
import { createTestTenant } from "@coss/tenancy/testing";
import { LATEST_API_VERSION } from "@coss/versioning";
import {
  createLogDrain,
  createWebhookEndpoint,
  runDueLogDrainDeliveries,
  runDueWebhookDeliveries,
} from "@coss/webhooks";
import {
  TEST_SECRETS_KEYS,
  testManagementDeps,
  testSender,
  webhookReceiver,
} from "@coss/webhooks/testing";
import {
  type EmailWebhookEvent,
  verifyLogDrainBatch,
  verifyWebhook,
  type WebhookEvent,
  WebhookVerificationError,
} from "coss";

function isEmailEvent(event: WebhookEvent): event is EmailWebhookEvent {
  return event.type.startsWith("email.");
}

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
          apiVersion: LATEST_API_VERSION,
          userId: null,
        },
        testManagementDeps,
      );
      const provider = new FakeEmailProvider({ log: false });
      const queue = memoryDispatchQueue();
      const service = createEmailService({
        liveProvider: provider,
        sandboxProvider: provider,
        queue,
      });
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
      expect(email.status).toBe("queued");
      expect(
        await runDueWebhookDeliveries(
          { scope: { organizationIds: [tenant.organization.id] } },
          { secretsKeys: TEST_SECRETS_KEYS, send: testSender() },
        ),
      ).toBe(0);
      await queue.drain(service);

      const attempted = await runDueWebhookDeliveries(
        { scope: { organizationIds: [tenant.organization.id] } },
        { secretsKeys: TEST_SECRETS_KEYS, send: testSender() },
      );
      expect(attempted).toBe(2);

      const events = (
        await Promise.all(
          receiver.received.map((request) => verifyWebhook(request.body, request.headers, secret)),
        )
      ).filter(isEmailEvent);
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

describe("scheduled send → webhook", () => {
  test("announces the schedule, then the send once the email is due", async () => {
    const tenant = await createTestTenant();
    const scope = { organizationIds: [tenant.organization.id] };
    const receiver = webhookReceiver();
    try {
      const { secret } = await createWebhookEndpoint(
        {
          organizationId: tenant.organization.id,
          environmentId: tenant.development.id,
          url: receiver.url,
          eventTypes: ["email.scheduled", "email.sent"],
          apiVersion: LATEST_API_VERSION,
          userId: null,
        },
        testManagementDeps,
      );
      const provider = new FakeEmailProvider({ log: false });
      const service = createEmailService({
        liveProvider: provider,
        sandboxProvider: provider,
        queue: memoryDispatchQueue(),
      });
      const scheduledAt = new Date(Date.now() + 60 * 60 * 1000);
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
          to: ["ok@example.com"],
          cc: [],
          bcc: [],
          reply_to: [],
          subject: "Later",
          html: null,
          text: "Hi",
          headers: {},
          tags: [],
          scheduled_at: scheduledAt.toISOString(),
        },
      });
      const deliverWebhooks = () =>
        runDueWebhookDeliveries({ scope }, { secretsKeys: TEST_SECRETS_KEYS, send: testSender() });

      expect(await deliverWebhooks()).toBe(1);
      expect(
        await service.dispatchDue({ now: new Date(scheduledAt.getTime() + 1000), scope }),
      ).toBe(1);
      expect(await deliverWebhooks()).toBe(1);

      const events = await Promise.all(
        receiver.received.map((request) => verifyWebhook(request.body, request.headers, secret)),
      );
      expect(events.filter(isEmailEvent).map((event) => [event.type, event.data.email_id])).toEqual(
        [
          ["email.scheduled", email.id],
          ["email.sent", email.id],
        ],
      );
      expect(provider.sent.map((message) => message.emailId)).toEqual([email.id]);
    } finally {
      receiver.stop();
    }
  });
});

describe("sandbox send → log drain", () => {
  test("streams the email's events and the webhook attempts as one signed batch", async () => {
    const tenant = await createTestTenant();
    const scope = { organizationIds: [tenant.organization.id] };
    const deps = { secretsKeys: TEST_SECRETS_KEYS, send: testSender() };
    const endpoint = webhookReceiver();
    const drainReceiver = webhookReceiver();
    try {
      const { endpoint: hook } = await createWebhookEndpoint(
        {
          organizationId: tenant.organization.id,
          environmentId: tenant.development.id,
          url: endpoint.url,
          eventTypes: ["email.delivered"],
          apiVersion: LATEST_API_VERSION,
          userId: null,
        },
        testManagementDeps,
      );
      const { secret } = await createLogDrain(
        {
          organizationId: tenant.organization.id,
          environmentId: tenant.development.id,
          url: drainReceiver.url,
          sources: ["email", "webhook"],
          userId: null,
        },
        testManagementDeps,
      );
      const provider = new FakeEmailProvider({ log: false });
      const queue = memoryDispatchQueue();
      const service = createEmailService({
        liveProvider: provider,
        sandboxProvider: provider,
        queue,
      });
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
          to: ["ok@example.com"],
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
      await queue.drain(service);
      expect(await runDueWebhookDeliveries({ scope }, deps)).toBe(1);
      expect(await runDueLogDrainDeliveries({ scope }, deps)).toBe(1);

      const [request] = drainReceiver.received;
      if (!request) throw new Error("nothing drained");
      const lines = await verifyLogDrainBatch(request.body, request.headers, secret);
      const summary = lines.map((line) =>
        line.object === "log" ? [line.type, line.resource_id] : [line.action, line.target_id],
      );
      expect(summary).toEqual([
        ["email.sent", email.id],
        ["email.delivered", email.id],
        ["webhook.attempt", email.id],
      ]);
      expect(lines.at(-1)).toMatchObject({ source: "webhook", status_code: 200 });
      expect(JSON.stringify(lines.at(-1))).toContain(hook.id);
    } finally {
      endpoint.stop();
      drainReceiver.stop();
    }
  });
});
