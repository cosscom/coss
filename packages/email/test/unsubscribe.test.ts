import { describe, expect, test } from "bun:test";
import { db, schema } from "@coss/db";
import { createTestTenant } from "@coss/tenancy/testing";
import { LATEST_API_VERSION } from "@coss/versioning";
import { createWebhookEndpoint, renderWebhookPayload } from "@coss/webhooks";
import { testManagementDeps } from "@coss/webhooks/testing";
import { and, eq } from "drizzle-orm";
import { FakeEmailProvider } from "../src/providers/fake.ts";
import { listEmailEvents } from "../src/read.ts";
import { EmailWebhookEvent, SendEmailRequest, type SendEmailRequestInput } from "../src/schemas.ts";
import { createEmailService } from "../src/service.ts";
import { listSuppressions, removeSuppression } from "../src/suppressions.ts";
import { memoryDispatchQueue } from "../src/testing.ts";
import { upsertTrackingRule } from "../src/tracking-settings.ts";
import { getUnsubscribe, recordUnsubscribe } from "../src/unsubscribe.ts";
import { params, sendEnvironment } from "./helpers.ts";

type Tenant = Awaited<ReturnType<typeof createTestTenant>>;

const BASE = "https://api.coss.test";
const ONE_CLICK = "List-Unsubscribe=One-Click";

function envOf(tenant: Tenant) {
  return { organizationId: tenant.organization.id, environmentId: tenant.development.id };
}

function rule(category: string | null, unsubscribe = true) {
  return { category, opens: false, clicks: false, unsubscribe };
}

async function send(tenant: Tenant, overrides: Partial<SendEmailRequestInput> = {}) {
  const provider = new FakeEmailProvider({ log: false });
  const queue = memoryDispatchQueue();
  const service = createEmailService({
    liveProvider: provider,
    sandboxProvider: provider,
    trackingBaseUrl: BASE,
    queue,
  });
  const { email } = await service.send({
    environment: sendEnvironment(tenant.development),
    apiKeyId: null,
    params: params({ category: "news", ...overrides }),
  });
  await queue.drain(service);
  const headers = provider.sent.at(-1)?.headers ?? {};
  const header = headers["List-Unsubscribe"];
  const token = header ? (/\/t\/u\/([^/>]+)>$/.exec(header)?.[1] ?? null) : null;
  return { email, headers, token, sent: provider.sent.length };
}

describe("adding the headers", () => {
  test("off by default", async () => {
    const tenant = await createTestTenant();
    const { email, headers } = await send(tenant);
    expect(headers["List-Unsubscribe"]).toBeUndefined();
    expect(email.tracking.unsubscribe).toBe(false);
  });

  test("a category rule adds both headers, on the provider's copy only", async () => {
    const tenant = await createTestTenant();
    await upsertTrackingRule(envOf(tenant), rule("news"));
    const { email, headers, token } = await send(tenant, { headers: { "X-Campaign": "fall" } });
    expect(email.tracking).toMatchObject({ unsubscribe: true, opens: false, clicks: false });
    expect(headers).toEqual({
      "x-campaign": "fall",
      "List-Unsubscribe": `<${BASE}/t/u/${token}>`,
      "List-Unsubscribe-Post": ONE_CLICK,
    });
    const [row] = await db.select().from(schema.email).where(eq(schema.email.id, email.id));
    expect(row?.trackingToken).toBe(token ?? "");
    expect(row?.headers).toEqual({ "x-campaign": "fall" });
    // Other categories keep the (absent) default.
    expect((await send(tenant, { category: "receipts" })).headers).toEqual({});
  });

  test("the environment default covers categorized emails only", async () => {
    const tenant = await createTestTenant();
    await upsertTrackingRule(envOf(tenant), rule(null));
    expect((await send(tenant)).email.tracking.unsubscribe).toBe(true);
    const uncategorized = await send(tenant, { category: undefined });
    expect(uncategorized.email.tracking.unsubscribe).toBe(false);
    expect(uncategorized.headers["List-Unsubscribe"]).toBeUndefined();
  });

  test("a rule leaves out emails with several recipients or their own header", async () => {
    const tenant = await createTestTenant();
    await upsertTrackingRule(envOf(tenant), rule("news"));
    const several = await send(tenant, { to: "a@example.com", bcc: "b@example.com" });
    expect(several.email.tracking.unsubscribe).toBe(false);
    expect(several.headers["List-Unsubscribe"]).toBeUndefined();
    // The same address twice is still one recipient.
    expect(
      (await send(tenant, { to: "a@example.com", cc: "A <A@example.com>" })).email.tracking
        .unsubscribe,
    ).toBe(true);

    // The two headers must fit the provider's limit of 15.
    const headers = (count: number) =>
      Object.fromEntries(Array.from({ length: count }, (_, i) => [`x-h${i}`, "v"]));
    const crowded = await send(tenant, { headers: headers(14) });
    expect(crowded.email.tracking.unsubscribe).toBe(false);
    expect(Object.keys(crowded.headers)).toHaveLength(14);
    const fits = await send(tenant, { headers: headers(13) });
    expect(Object.keys(fits.headers)).toHaveLength(15);

    const own = await send(tenant, { headers: { "List-Unsubscribe": "<mailto:u@acme.com>" } });
    expect(own.email.tracking.unsubscribe).toBe(false);
    expect(own.headers).toEqual({ "list-unsubscribe": "<mailto:u@acme.com>" });
  });

  test("per send beats the rule", async () => {
    const tenant = await createTestTenant();
    expect((await send(tenant, { tracking: { unsubscribe: true } })).token).not.toBeNull();
    await upsertTrackingRule(envOf(tenant), rule("news"));
    expect((await send(tenant, { tracking: { unsubscribe: false } })).token).toBeNull();
  });

  test("an explicit request that can't be honored is invalid", () => {
    const base = {
      from: "hello@acme.com",
      to: "user@example.com",
      subject: "Hi",
      text: "Hi",
      category: "news",
      tracking: { unsubscribe: true },
    };
    const issues = (input: object) =>
      SendEmailRequest.safeParse(input).error?.issues.map((issue) => [
        issue.path.join("."),
        issue.message,
      ]) ?? [];
    expect(issues(base)).toEqual([]);
    expect(issues({ ...base, category: undefined })[0]?.[0]).toBe("tracking.unsubscribe");
    expect(issues({ ...base, cc: "other@example.com" })[0]?.[0]).toBe("tracking.unsubscribe");
    expect(issues({ ...base, headers: { "List-Unsubscribe-Post": ONE_CLICK } })[0]?.[0]).toBe(
      "tracking.unsubscribe",
    );
    const headers = Object.fromEntries(
      Array.from({ length: 14 }, (_, i) => [`x-h${i}`, "v"] as const),
    );
    expect(issues({ ...base, headers })).toEqual([
      [
        "tracking.unsubscribe",
        "One-click unsubscribe adds 2 headers: send at most 13 of your own.",
      ],
    ]);
    // Absent stays absent, so request hashes from before the field existed stay valid.
    expect(SendEmailRequest.parse({ ...base, tracking: { opens: true } }).tracking).toEqual({
      opens: true,
    });
    expect(SendEmailRequest.parse(base).tracking).toEqual({ unsubscribe: true });
  });
});

describe("unsubscribing", () => {
  test("records the event and webhook and suppresses the recipient for the category", async () => {
    const tenant = await createTestTenant();
    const env = envOf(tenant);
    await upsertTrackingRule(env, rule("news"));
    const { endpoint } = await createWebhookEndpoint(
      {
        ...env,
        url: "https://example.com/hook",
        eventTypes: ["email.unsubscribed"],
        apiVersion: LATEST_API_VERSION,
        userId: null,
      },
      testManagementDeps,
    );
    const { email, token } = await send(tenant, { to: "Jane <Jane@Example.com>" });
    expect(await getUnsubscribe(token ?? "")).toEqual({ category: "news" });

    expect(await recordUnsubscribe({ token: token ?? "" })).toBe(true);
    expect(await recordUnsubscribe({ token: token ?? "" })).toBe(true);

    const events = (await listEmailEvents({ ...env, emailId: email.id }))?.events ?? [];
    const unsubscribed = events.filter((event) => event.type === "email.unsubscribed");
    expect(unsubscribed.map((event) => event.recipient)).toEqual(["jane@example.com"]);
    // Never changes the recipient's delivery status.
    expect(events.some((event) => event.type === "email.delivered")).toBe(true);

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
    expect(payloads.map((p) => [p.type, p.data.recipient, p.data.category])).toEqual([
      ["email.unsubscribed", "jane@example.com", "news"],
    ]);

    const list = await listSuppressions(env);
    expect(list.data).toMatchObject([
      { address: "jane@example.com", scope: "news", reason: "unsubscribe", email_id: email.id },
    ]);

    // The category is suppressed from now on; other emails still go out.
    const next = await send(tenant, { to: "jane@example.com" });
    expect(next.email.recipients[0]?.status).toBe("suppressed");
    expect(next.sent).toBe(0);
    const other = await send(tenant, { to: "jane@example.com", category: "receipts" });
    expect(other.sent).toBe(1);

    // Unsubscribing again restores an entry removed since, without a second event.
    await removeSuppression(env, list.data[0]?.id ?? "");
    expect(await recordUnsubscribe({ token: token ?? "" })).toBe(true);
    expect((await listSuppressions(env)).data).toHaveLength(1);
    const again = await db
      .select({ id: schema.emailEvent.id })
      .from(schema.emailEvent)
      .where(
        and(
          eq(schema.emailEvent.emailId, email.id),
          eq(schema.emailEvent.type, "email.unsubscribed"),
        ),
      );
    expect(again).toHaveLength(1);
  });

  test("invalid links unsubscribe nobody", async () => {
    const tenant = await createTestTenant();
    // Tracked, but without unsubscribe: its token doesn't unsubscribe.
    const tracked = await send(tenant, { tracking: { opens: true } });
    const [row] = await db
      .select({ token: schema.email.trackingToken })
      .from(schema.email)
      .where(eq(schema.email.id, tracked.email.id));
    expect(row?.token).not.toBeNull();
    expect(await recordUnsubscribe({ token: row?.token ?? "" })).toBe(false);
    expect(await getUnsubscribe(row?.token ?? "")).toBeNull();
    expect(await recordUnsubscribe({ token: "x".repeat(32) })).toBe(false);
    expect(await recordUnsubscribe({ token: "not a token" })).toBe(false);
    expect((await listSuppressions(envOf(tenant))).data).toEqual([]);
  });
});
