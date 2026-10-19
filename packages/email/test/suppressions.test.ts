import { describe, expect, test } from "bun:test";
import { db, schema } from "@coss/db";
import { createTestTenant } from "@coss/tenancy/testing";
import { LATEST_API_VERSION } from "@coss/versioning";
import { createWebhookEndpoint, renderWebhookPayload } from "@coss/webhooks";
import { testManagementDeps } from "@coss/webhooks/testing";
import { and, eq } from "drizzle-orm";
import { ingestProviderEvents } from "../src/events.ts";
import type { ProviderEvent } from "../src/provider.ts";
import { FakeEmailProvider } from "../src/providers/fake.ts";
import { listEmailEvents } from "../src/read.ts";
import { CreateSuppressionRequest, EmailWebhookEvent } from "../src/schemas.ts";
import {
  addSuppression,
  checkSuppression,
  exportSuppressionPages,
  getSuppression,
  importSuppressions,
  listSuppressions,
  removeSuppression,
  type SuppressionEnvironment,
  suppressionsCsvStream,
} from "../src/suppressions.ts";
import { dispatchingEmailService } from "../src/testing.ts";
import { params, sendEnvironment } from "./helpers.ts";

type Tenant = Awaited<ReturnType<typeof createTestTenant>>;

function envOf(tenant: Tenant, which: "development" | "production" = "development") {
  return { organizationId: tenant.organization.id, environmentId: tenant[which].id };
}

function suppress(env: SuppressionEnvironment, address: string, scope?: string) {
  return addSuppression(env, CreateSuppressionRequest.parse({ address, scope }));
}

function fakeService() {
  const provider = new FakeEmailProvider({ log: false });
  return {
    provider,
    service: dispatchingEmailService({ liveProvider: provider, sandboxProvider: provider }),
  };
}

async function sendSandbox(tenant: Tenant, overrides: Parameters<typeof params>[0] = {}) {
  const { provider, service } = fakeService();
  const { email } = await service.send({
    environment: sendEnvironment(tenant.development),
    apiKeyId: null,
    params: params(overrides),
  });
  return { email, sent: provider.sent };
}

function bounce(emailId: string, address: string, overrides: Partial<ProviderEvent> = {}) {
  return {
    provider: "fake",
    providerEventType: "Bounce",
    emailId,
    providerMessageId: null,
    type: "email.bounced",
    recipients: [address],
    occurredAt: new Date(),
    sourceId: crypto.randomUUID(),
    data: { bounce: { type: "permanent", sub_type: "General", diagnostic_code: null } },
    ...overrides,
  } satisfies ProviderEvent;
}

describe("managing the list", () => {
  test("adding is idempotent per address and scope", async () => {
    const tenant = await createTestTenant();
    const env = envOf(tenant);

    const first = await suppress(env, "Jane <Jane@Example.com>");
    expect(first?.created).toBe(true);
    expect(first?.suppression).toMatchObject({
      object: "suppression",
      address: "jane@example.com",
      scope: "*",
      reason: "manual",
      email_id: null,
    });
    const again = await suppress(env, "jane@example.com");
    expect(again?.created).toBe(false);
    expect(again?.suppression).toEqual(first?.suppression);

    const scoped = await suppress(env, "jane@example.com", "marketing");
    expect(scoped?.created).toBe(true);
    expect(scoped?.suppression.id).not.toBe(first?.suppression.id);
  });

  test("lists newest first with a cursor and filters", async () => {
    const tenant = await createTestTenant();
    const env = envOf(tenant);
    const a = await suppress(env, "a@example.com");
    const b = await suppress(env, "b@example.com", "news");
    const c = await suppress(env, "c@example.com");

    const page1 = await listSuppressions(env, { limit: 2 });
    expect(page1.data.map((s) => s.address)).toEqual(["c@example.com", "b@example.com"]);
    expect(page1.has_more).toBe(true);
    const page2 = await listSuppressions(env, { limit: 2, after: page1.data[1]?.id });
    expect(page2.data.map((s) => s.id)).toEqual([a?.suppression.id ?? ""]);
    expect(page2.has_more).toBe(false);

    expect((await listSuppressions(env, { scope: "news" })).data.map((s) => s.id)).toEqual([
      b?.suppression.id ?? "",
    ]);
    expect(
      (await listSuppressions(env, { address: "c@example.com" })).data.map((s) => s.id),
    ).toEqual([c?.suppression.id ?? ""]);
    expect(await listSuppressions(env, { after: "not-an-id" })).toEqual({
      object: "list",
      data: [],
      has_more: false,
    });
  });

  test("check matches * always and a category only when asked about it", async () => {
    const tenant = await createTestTenant();
    const env = envOf(tenant);
    await suppress(env, "all@example.com");
    await suppress(env, "news@example.com", "news");

    expect((await checkSuppression(env, { address: "all@example.com" })).suppressed).toBe(true);
    expect(
      (await checkSuppression(env, { address: "all@example.com", category: "billing" })).suppressed,
    ).toBe(true);
    expect((await checkSuppression(env, { address: "news@example.com" })).suppressed).toBe(false);
    const news = await checkSuppression(env, { address: "news@example.com", category: "news" });
    expect(news).toMatchObject({ object: "suppression_check", suppressed: true });
    expect(news.suppressions.map((s) => s.scope)).toEqual(["news"]);
    expect(
      (await checkSuppression(env, { address: "news@example.com", category: "billing" }))
        .suppressed,
    ).toBe(false);
  });

  test("get and remove are scoped to the environment", async () => {
    const tenant = await createTestTenant();
    const other = await createTestTenant();
    const env = envOf(tenant);
    const added = await suppress(env, "jane@example.com");
    const id = added?.suppression.id ?? "";

    // Another environment of the same project, and another organization, see nothing.
    for (const foreign of [envOf(tenant, "production"), envOf(other)]) {
      expect(await getSuppression(foreign, id)).toBeNull();
      expect(await removeSuppression(foreign, id)).toBe(false);
      expect((await listSuppressions(foreign)).data).toEqual([]);
      expect((await checkSuppression(foreign, { address: "jane@example.com" })).suppressed).toBe(
        false,
      );
    }
    expect(
      await addSuppression(
        { organizationId: other.organization.id, environmentId: tenant.development.id },
        { address: "x@example.com", scope: "*" },
      ),
    ).toBeNull();

    expect(await getSuppression(env, id)).toEqual(added?.suppression ?? null);
    expect(await getSuppression(env, "garbage")).toBeNull();
    expect(await removeSuppression(env, id)).toBe(true);
    expect(await removeSuppression(env, id)).toBe(false);
    expect(await getSuppression(env, id)).toBeNull();
  });
});

describe("bulk import and export", () => {
  test("imports valid entries, counts existing and repeated ones, and reports invalid ones", async () => {
    const tenant = await createTestTenant();
    const env = envOf(tenant);
    const manual = await suppress(env, "known@example.com");

    const result = await importSuppressions(env, [
      { address: "Jane <Jane@Example.com>" },
      { address: "jane@example.com", scope: "*" },
      { address: "jane@example.com", scope: "marketing" },
      { address: "not-an-address" },
      { address: "known@example.com" },
      { address: "joe@example.com", scope: "has space" },
    ]);
    expect(result).toEqual({
      object: "suppression_import",
      created: 2,
      existing: 2,
      invalid: [
        {
          index: 3,
          address: "not-an-address",
          message: expect.stringContaining("Invalid address"),
        },
        {
          index: 5,
          address: "joe@example.com",
          message: expect.stringContaining("Invalid scope"),
        },
      ],
    });
    const listed = await listSuppressions(env);
    expect(listed.data.map((s) => [s.address, s.scope, s.reason]).sort()).toEqual([
      ["jane@example.com", "*", "import"],
      ["jane@example.com", "marketing", "import"],
      ["known@example.com", "*", "manual"],
    ]);
    // Existing entries are left alone, and importing again changes nothing.
    expect((await getSuppression(env, manual?.suppression.id ?? ""))?.reason).toBe("manual");
    expect(
      await importSuppressions(env, [{ address: "jane@example.com" }, { address: "x" }]),
    ).toMatchObject({ created: 0, existing: 1, invalid: [{ index: 1 }] });
  });

  test("keeps an entry's own reason and date (migrations), and never changes existing entries", async () => {
    const tenant = await createTestTenant();
    const env = envOf(tenant);
    await suppress(env, "known@example.com");
    const createdAt = new Date("2024-03-01T12:00:00.000Z");

    const result = await importSuppressions(env, [
      { address: "bounced@example.com", reason: "bounce", createdAt },
      { address: "complained@example.com", reason: "complaint" },
      { address: "left@example.com", scope: "news", reason: "unsubscribe" },
      { address: "known@example.com", reason: "bounce" },
    ]);
    expect(result).toMatchObject({ created: 3, existing: 1, invalid: [] });
    const listed = await listSuppressions(env);
    expect(listed.data.map((s) => [s.address, s.scope, s.reason]).sort()).toEqual([
      ["bounced@example.com", "*", "bounce"],
      ["complained@example.com", "*", "complaint"],
      ["known@example.com", "*", "manual"],
      ["left@example.com", "news", "unsubscribe"],
    ]);
    expect(listed.data.find((s) => s.address === "bounced@example.com")?.created_at).toBe(
      createdAt.toISOString(),
    );
  });

  test("imports only into the given environment of the given organization", async () => {
    const tenant = await createTestTenant();
    const other = await createTestTenant();
    await importSuppressions(envOf(tenant), [{ address: "jane@example.com" }]);
    expect((await listSuppressions(envOf(tenant, "production"))).data).toEqual([]);
    expect(
      await importSuppressions(
        { organizationId: other.organization.id, environmentId: tenant.development.id },
        [{ address: "x@example.com" }],
      ),
    ).toBeNull();
  });

  test("exports every entry in pages of 1,000, with filters", async () => {
    const tenant = await createTestTenant();
    const env = envOf(tenant);
    const addresses = Array.from({ length: 1001 }, (_, i) => ({ address: `user${i}@example.com` }));
    expect((await importSuppressions(env, addresses))?.created).toBe(1001);
    await suppress(env, "news@example.com", "news");

    const pages: number[] = [];
    const exported: string[] = [];
    for await (const page of exportSuppressionPages(env)) {
      pages.push(page.length);
      exported.push(...page.map((s) => s.address));
    }
    expect(pages).toEqual([1000, 2]);
    expect(exported).toContain("news@example.com");
    expect(new Set(exported).size).toBe(1002);

    const news: string[] = [];
    for await (const page of exportSuppressionPages(env, { scope: "news" })) {
      news.push(...page.map((s) => s.address));
    }
    expect(news).toEqual(["news@example.com"]);
    const manual: string[] = [];
    for await (const page of exportSuppressionPages(env, { reason: "manual" })) {
      manual.push(...page.map((s) => s.address));
    }
    expect(manual).toEqual(["news@example.com"]);
  });

  test("the CSV stream starts with the header and is empty for an empty list", async () => {
    const tenant = await createTestTenant();
    const env = envOf(tenant);
    expect(await new Response(suppressionsCsvStream(env)).text()).toBe(
      "address,scope,reason,created_at,email_id,id\r\n",
    );
    const added = await suppress(env, "jane@example.com", "news");
    const csv = await new Response(suppressionsCsvStream(env)).text();
    expect(csv.split("\r\n")[1]).toBe(
      `jane@example.com,news,manual,${added?.suppression.created_at},,${added?.suppression.id}`,
    );
  });
});

describe("sending", () => {
  test("skips suppressed recipients (to, cc and bcc) and sends to the rest", async () => {
    const tenant = await createTestTenant();
    const env = envOf(tenant);
    const entry = await suppress(env, "blocked@example.com");
    await suppress(env, "hidden@example.com");
    const { endpoint } = await createWebhookEndpoint(
      {
        ...env,
        url: "https://example.com/hook",
        eventTypes: ["email.suppressed"],
        apiVersion: LATEST_API_VERSION,
        userId: null,
      },
      testManagementDeps,
    );

    const { email, sent } = await sendSandbox(tenant, {
      to: ["ok@example.com", "Blocked <BLOCKED@example.com>"],
      cc: "hidden@example.com",
      bcc: "hidden@example.com",
    });

    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ to: ["ok@example.com"], cc: [], bcc: [] });
    expect(email.status).toBe("sent");
    expect(email.recipients.map((r) => [r.address, r.status])).toEqual([
      ["ok@example.com", "delivered"],
      ["blocked@example.com", "suppressed"],
      ["hidden@example.com", "suppressed"],
    ]);

    const result = await listEmailEvents({ ...env, emailId: email.id });
    const suppressedEvents = result?.events.filter((e) => e.type === "email.suppressed") ?? [];
    expect(suppressedEvents.map((e) => e.recipient).sort()).toEqual([
      "blocked@example.com",
      "hidden@example.com",
    ]);
    expect(suppressedEvents.find((e) => e.recipient === "blocked@example.com")?.data).toEqual({
      suppression: { id: entry?.suppression.id ?? "", scope: "*", reason: "manual" },
    });

    for (const event of suppressedEvents) {
      const recipient = email.recipients.find((r) => r.address === event.recipient);
      expect(recipient?.last_event_at).toBe(event.occurred_at);
      const [stored] = await db
        .select()
        .from(schema.emailRecipient)
        .where(
          and(
            eq(schema.emailRecipient.emailId, email.id),
            eq(schema.emailRecipient.address, event.recipient ?? ""),
          ),
        );
      expect(stored?.details).toEqual(event.data);
    }

    const messages = await db
      .select({ payload: schema.webhookMessage.payload })
      .from(schema.webhookDelivery)
      .innerJoin(
        schema.webhookMessage,
        eq(schema.webhookMessage.id, schema.webhookDelivery.messageId),
      )
      .where(eq(schema.webhookDelivery.endpointId, endpoint.id));
    const payloads = messages.map((m) =>
      EmailWebhookEvent.parse(renderWebhookPayload(m.payload, LATEST_API_VERSION)),
    );
    expect(payloads.map((p) => [p.type, p.data.recipient]).sort()).toEqual([
      ["email.suppressed", "blocked@example.com"],
      ["email.suppressed", "hidden@example.com"],
    ]);
  });

  test("a category entry only applies to emails of that category", async () => {
    const tenant = await createTestTenant();
    await suppress(envOf(tenant), "jane@example.com", "marketing");

    const marketing = await sendSandbox(tenant, { to: "jane@example.com", category: "marketing" });
    expect(marketing.email.category).toBe("marketing");
    expect(marketing.email.recipients[0]?.status).toBe("suppressed");

    const receipt = await sendSandbox(tenant, { to: "jane@example.com", category: "receipts" });
    expect(receipt.email.recipients[0]?.status).toBe("delivered");
    const uncategorized = await sendSandbox(tenant, { to: "jane@example.com" });
    expect(uncategorized.email.category).toBeNull();
    expect(uncategorized.email.recipients[0]?.status).toBe("delivered");
  });

  test("an email whose every recipient is suppressed never reaches the provider", async () => {
    const tenant = await createTestTenant();
    await suppress(envOf(tenant), "jane@example.com");

    const { email, sent } = await sendSandbox(tenant, { to: "jane@example.com" });

    expect(sent).toHaveLength(0);
    expect(email.status).toBe("failed");
    expect(email.recipients.map((r) => r.status)).toEqual(["suppressed"]);
    const [row] = await db.select().from(schema.email).where(eq(schema.email.id, email.id));
    expect(row).toMatchObject({ errorCode: "all_recipients_suppressed", sentAt: null });
    const result = await listEmailEvents({ ...envOf(tenant), emailId: email.id });
    expect(result?.events.map((e) => e.type)).toEqual(["email.suppressed"]);
  });

  test("other environments' lists do not apply", async () => {
    const tenant = await createTestTenant();
    await suppress(envOf(tenant, "production"), "jane@example.com");
    const { email } = await sendSandbox(tenant, { to: "jane@example.com" });
    expect(email.recipients[0]?.status).toBe("delivered");
  });
});

describe("automatic entries", () => {
  test("a permanent bounce suppresses the address for every later email", async () => {
    const tenant = await createTestTenant();
    const { email } = await sendSandbox(tenant, { to: "gone@example.com", category: "news" });

    await ingestProviderEvents([bounce(email.id, "gone@example.com")]);
    const listed = await listSuppressions(envOf(tenant));
    expect(listed.data).toHaveLength(1);
    expect(listed.data[0]).toMatchObject({
      address: "gone@example.com",
      scope: "*",
      reason: "bounce",
      email_id: email.id,
    });

    const next = await sendSandbox(tenant, { to: "gone@example.com", category: "receipts" });
    expect(next.email.recipients[0]?.status).toBe("suppressed");
    expect(next.sent).toHaveLength(0);
  });

  test("a complaint suppresses the address", async () => {
    const tenant = await createTestTenant();
    const { email } = await sendSandbox(tenant, { to: "angry@example.com" });
    await ingestProviderEvents([
      bounce(email.id, "angry@example.com", {
        providerEventType: "Complaint",
        type: "email.complained",
        data: { complaint: { feedback_type: "abuse", sub_type: null } },
      }),
    ]);
    expect((await listSuppressions(envOf(tenant))).data).toMatchObject([
      { address: "angry@example.com", scope: "*", reason: "complaint", email_id: email.id },
    ]);
  });

  test("transient bounces, provider-suppressed bounces and duplicates add nothing new", async () => {
    const tenant = await createTestTenant();
    const { email } = await sendSandbox(tenant, { to: ["soft@example.com", "ses@example.com"] });
    await ingestProviderEvents([
      bounce(email.id, "soft@example.com", {
        data: { bounce: { type: "transient", sub_type: "MailboxFull", diagnostic_code: null } },
      }),
      bounce(email.id, "ses@example.com", { suppressed: true }),
    ]);
    expect((await listSuppressions(envOf(tenant))).data).toEqual([]);

    const permanent = bounce(email.id, "soft@example.com");
    await ingestProviderEvents([permanent, permanent]);
    await ingestProviderEvents([bounce(email.id, "soft@example.com")]);
    expect((await listSuppressions(envOf(tenant))).data).toHaveLength(1);
  });

  test("mailbox simulator addresses are never suppressed", async () => {
    const tenant = await createTestTenant();
    await sendSandbox(tenant, {
      to: ["bounce@simulator.amazonses.com", "complaint@simulator.amazonses.com"],
    });
    expect((await listSuppressions(envOf(tenant))).data).toEqual([]);
    const again = await sendSandbox(tenant, { to: "bounce@simulator.amazonses.com" });
    expect(again.email.recipients[0]?.status).toBe("bounced");
  });

  test("a manual entry keeps its reason when a bounce follows", async () => {
    const tenant = await createTestTenant();
    const { email } = await sendSandbox(tenant, { to: "jane@example.com" });
    const manual = await suppress(envOf(tenant), "jane@example.com");
    await ingestProviderEvents([bounce(email.id, "jane@example.com")]);
    const listed = await listSuppressions(envOf(tenant));
    expect(listed.data).toHaveLength(1);
    expect(listed.data[0]).toEqual(manual?.suppression);
  });
});
