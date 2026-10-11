import { describe, expect, test } from "bun:test";
import { db, schema } from "@coss/db";
import { queryLogs } from "@coss/logs";
import { createTestTenant } from "@coss/tenancy/testing";
import { createWebhookEndpoint } from "@coss/webhooks";
import { testManagementDeps } from "@coss/webhooks/testing";
import { and, asc, eq } from "drizzle-orm";
import { ingestProviderEvents } from "../src/events.ts";
import type { ProviderEvent } from "../src/provider.ts";
import { FakeEmailProvider } from "../src/providers/fake.ts";
import { getEmail, listEmailEvents } from "../src/read.ts";
import { EmailWebhookEvent } from "../src/schemas.ts";
import { dispatchingEmailService } from "../src/testing.ts";
import { params, sendEnvironment } from "./helpers.ts";

function service(opts: { fail?: boolean } = {}) {
  const provider = new FakeEmailProvider({ log: false, fail: () => opts.fail ?? false });
  return dispatchingEmailService({ liveProvider: provider, sandboxProvider: provider });
}

async function sendSandbox(overrides: Parameters<typeof params>[0] = {}, opts = {}) {
  const tenant = await createTestTenant();
  const { email } = await service(opts).send({
    environment: sendEnvironment(tenant.development),
    apiKeyId: null,
    params: params(overrides),
  });
  return { tenant, email };
}

async function events(tenant: Awaited<ReturnType<typeof createTestTenant>>, emailId: string) {
  const result = await listEmailEvents({
    organizationId: tenant.organization.id,
    environmentId: tenant.development.id,
    emailId,
  });
  if (!result) throw new Error("email not found");
  return result.events;
}

function event(emailId: string, overrides: Partial<ProviderEvent>): ProviderEvent {
  return {
    provider: "fake",
    providerEventType: "Delivery",
    emailId,
    providerMessageId: null,
    type: "email.delivered",
    recipients: ["user@example.com"],
    occurredAt: new Date(),
    sourceId: crypto.randomUUID(),
    data: {},
    ...overrides,
  };
}

async function recipientStatus(emailId: string, address = "user@example.com") {
  const [row] = await db
    .select({ status: schema.emailRecipient.status })
    .from(schema.emailRecipient)
    .where(
      and(eq(schema.emailRecipient.emailId, emailId), eq(schema.emailRecipient.address, address)),
    );
  return row?.status;
}

describe("recipients", () => {
  test("one recipient per distinct address, first kind wins, in send order", async () => {
    const { email } = await sendSandbox({
      to: ["A <User@Example.com>", "second@example.com"],
      cc: "user@example.com",
      bcc: ["hidden@example.com"],
    });

    expect(email.recipients.map(({ address, type }) => ({ address, type }))).toEqual([
      { address: "user@example.com", type: "to" },
      { address: "second@example.com", type: "to" },
      { address: "hidden@example.com", type: "bcc" },
    ]);
    expect(email.recipients.every((r) => r.status === "delivered")).toBe(true);
    expect(email.recipients.every((r) => r.last_event_at !== null)).toBe(true);
  });

  test("simulator addresses behave like the SES mailbox simulator", async () => {
    const { tenant, email } = await sendSandbox({
      to: [
        "success@simulator.amazonses.com",
        "bounce@simulator.amazonses.com",
        "complaint@simulator.amazonses.com",
        "suppressionlist@simulator.amazonses.com",
      ],
    });

    expect(Object.fromEntries(email.recipients.map((r) => [r.address, r.status]))).toEqual({
      "success@simulator.amazonses.com": "delivered",
      "bounce@simulator.amazonses.com": "bounced",
      "complaint@simulator.amazonses.com": "complained",
      "suppressionlist@simulator.amazonses.com": "suppressed",
    });
    const list = await events(tenant, email.id);
    expect(list[0]).toMatchObject({ object: "email_event", type: "email.sent", recipient: null });
    expect(list.find((e) => e.type === "email.bounced")).toMatchObject({
      email_id: email.id,
      recipient: "bounce@simulator.amazonses.com",
      data: { bounce: { type: "permanent", sub_type: "General" } },
    });
    expect(list.filter((e) => e.type === "email.complained")).toHaveLength(1);
  });

  test("a provider failure fails every recipient and records email.failed", async () => {
    const { tenant, email } = await sendSandbox({ cc: "copy@example.com" }, { fail: true });

    expect(email.status).toBe("failed");
    expect(email.recipients.map((r) => r.status)).toEqual(["failed", "failed"]);
    const list = await events(tenant, email.id);
    expect(list).toEqual([
      expect.objectContaining({
        type: "email.failed",
        recipient: null,
        data: { failure: { code: "provider_error", message: expect.any(String) } },
      }),
    ]);
  });
});

describe("ingestProviderEvents", () => {
  test("is idempotent and never moves a recipient to a lower status", async () => {
    const { tenant, email } = await sendSandbox();
    const before = (await events(tenant, email.id)).length;

    const delay = event(email.id, {
      providerEventType: "DeliveryDelay",
      type: "email.delivery_delayed",
      data: { delay: { type: "MailboxFull", expires_at: null, diagnostic_code: null } },
    });
    expect(await ingestProviderEvents([delay])).toBe(1);
    expect(await ingestProviderEvents([delay])).toBe(0);
    // Recorded, but `delivered` outranks `delivery_delayed`.
    expect(await recipientStatus(email.id)).toBe("delivered");

    const complaint = event(email.id, {
      providerEventType: "Complaint",
      type: "email.complained",
      recipients: ["USER@example.com", "stranger@example.com"],
    });
    expect(await ingestProviderEvents([complaint])).toBe(1);
    expect(await recipientStatus(email.id)).toBe("complained");
    expect(await events(tenant, email.id)).toHaveLength(before + 2);
  });

  test("ignores unknown emails and events from another provider or message", async () => {
    const { email } = await sendSandbox();
    const complaint = { providerEventType: "Complaint", type: "email.complained" } as const;

    expect(await ingestProviderEvents([event("email_01k7c8m4q2f3e9v6t5r1n0p8yz", {})])).toBe(0);
    expect(await ingestProviderEvents([event(email.id, { ...complaint, provider: "ses" })])).toBe(
      0,
    );
    expect(
      await ingestProviderEvents([event(email.id, { ...complaint, providerMessageId: "other" })]),
    ).toBe(0);
    expect(await recipientStatus(email.id)).toBe("delivered");
  });

  test("a send event marks a queued or interrupted email sent", async () => {
    const tenant = await createTestTenant();
    const { email } = await service({ fail: true }).send({
      environment: sendEnvironment(tenant.development),
      apiKeyId: null,
      params: params(),
    });
    await db
      .update(schema.email)
      .set({ errorCode: "dispatch_interrupted" })
      .where(eq(schema.email.id, email.id));

    const sent = event(email.id, {
      providerEventType: "Send",
      type: "email.sent",
      recipients: null,
      providerMessageId: "fake_late",
    });
    expect(await ingestProviderEvents([sent])).toBe(1);

    const after = await getEmail({
      organizationId: tenant.organization.id,
      environmentId: tenant.development.id,
      id: email.id,
    });
    expect(after).toMatchObject({ status: "sent", sent_at: expect.any(String) });
    // The interrupted email's recipients start over.
    expect(after?.recipients[0]?.status).toBe("sent");
  });
});

describe("webhook outbox", () => {
  test("every new event is queued for the environment's subscribed endpoints", async () => {
    const tenant = await createTestTenant();
    const { endpoint } = await createWebhookEndpoint(
      {
        organizationId: tenant.organization.id,
        environmentId: tenant.development.id,
        url: "https://example.com/hook",
        eventTypes: ["email.sent", "email.bounced"],
        userId: null,
      },
      testManagementDeps,
    );

    const { email } = await service().send({
      environment: sendEnvironment(tenant.development),
      apiKeyId: null,
      params: params({
        to: ["ok@example.com", "bounce@simulator.amazonses.com"],
        tags: [{ name: "kind", value: "welcome" }],
        bcc: "secret@example.com",
      }),
    });

    const messages = await db
      .select({ message: schema.webhookMessage })
      .from(schema.webhookDelivery)
      .innerJoin(
        schema.webhookMessage,
        eq(schema.webhookMessage.id, schema.webhookDelivery.messageId),
      )
      .where(eq(schema.webhookDelivery.endpointId, endpoint.id))
      .orderBy(asc(schema.webhookMessage.createdAt), asc(schema.webhookMessage.id));
    const payloads = messages.map(({ message }) => EmailWebhookEvent.parse(message.payload));
    expect(payloads.map((p) => [p.type, p.data.recipient])).toEqual([
      ["email.sent", null],
      ["email.bounced", "bounce@simulator.amazonses.com"],
    ]);
    expect(payloads[1]).toMatchObject({
      object: "event",
      data: {
        email_id: email.id,
        from: email.from,
        to: email.to,
        subject: email.subject,
        tags: [{ name: "kind", value: "welcome" }],
        sandbox: true,
        bounce: { type: "permanent", sub_type: "General" },
      },
    });
    // Never the content or hidden recipients.
    expect(JSON.stringify(payloads)).not.toContain("secret@example.com");
    expect(JSON.stringify(payloads)).not.toContain("Hello!");
    const listed = await events(tenant, email.id);
    expect(payloads[1]?.id).toBe(listed.find((e) => e.type === "email.bounced")?.id ?? "missing");
  });
});

describe("listEmailEvents", () => {
  test("is scoped to the organization and environment", async () => {
    const { tenant, email } = await sendSandbox();
    const other = await createTestTenant();

    expect(
      await listEmailEvents({
        organizationId: other.organization.id,
        environmentId: other.development.id,
        emailId: email.id,
      }),
    ).toBeNull();
    expect(
      await listEmailEvents({
        organizationId: tenant.organization.id,
        environmentId: tenant.production.id,
        emailId: email.id,
      }),
    ).toBeNull();
    expect(
      await listEmailEvents({
        organizationId: tenant.organization.id,
        environmentId: tenant.development.id,
        emailId: "not-an-id",
      }),
    ).toBeNull();
  });
});

describe("environment log", () => {
  async function logLines(tenant: Awaited<ReturnType<typeof createTestTenant>>, emailId: string) {
    const page = await queryLogs({
      organizationId: tenant.organization.id,
      environmentId: tenant.development.id,
      from: new Date(Date.now() - 3_600_000),
      to: new Date(Date.now() + 3_600_000),
      filters: { resourceId: emailId },
      limit: 100,
    });
    return page.data.reverse();
  }

  test("every new event is logged once, deduplicated with the event", async () => {
    const { tenant, email } = await sendSandbox();
    const bounce = event(email.id, {
      type: "email.bounced",
      providerEventType: "Bounce",
      occurredAt: new Date(Date.now() + 1000),
      data: { bounce: { type: "permanent", sub_type: "General", diagnostic_code: null } },
    });
    expect(await ingestProviderEvents([bounce, bounce])).toBe(1);

    const lines = await logLines(tenant, email.id);
    expect(lines.map((line) => [line.type, line.level])).toEqual([
      ["email.sent", "info"],
      ["email.delivered", "info"],
      ["email.bounced", "error"],
    ]);
    expect(lines[2]).toMatchObject({
      source: "email",
      message: "Bounced: user@example.com (permanent, General)",
      recipient: "user@example.com",
      resource_type: "email",
      attributes: expect.objectContaining({
        provider: "fake",
        provider_event_type: "Bounce",
        subject: "Welcome",
        bounce: { type: "permanent", sub_type: "General", diagnostic_code: null },
      }),
    });
  });
});
