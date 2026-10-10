import { describe, expect, test } from "bun:test";
import { db, schema } from "@coss/db";
import { createTestTenant } from "@coss/tenancy/testing";
import { createWebhookEndpoint } from "@coss/webhooks";
import { testManagementDeps } from "@coss/webhooks/testing";
import { and, eq } from "drizzle-orm";
import { FakeEmailProvider } from "../src/providers/fake.ts";
import { getEmail, listEmailEvents, listEmailLinks } from "../src/read.ts";
import { EmailWebhookEvent, type SendEmailRequestInput } from "../src/schemas.ts";
import { createEmailService } from "../src/service.ts";
import { addSuppression } from "../src/suppressions.ts";
import { trackingUrls } from "../src/testing.ts";
import { recordClick, recordOpen } from "../src/tracking.ts";
import {
  deleteTrackingRule,
  getTrackingSettings,
  upsertTrackingRule,
} from "../src/tracking-settings.ts";
import { params, sendEnvironment } from "./helpers.ts";

type Tenant = Awaited<ReturnType<typeof createTestTenant>>;

const BASE = "https://api.coss.test";
const HTML =
  '<html><body><p>Hi</p><a href="https://acme.com/one">1</a><a href="https://acme.com/two">2</a></body></html>';

function envOf(tenant: Tenant) {
  return { organizationId: tenant.organization.id, environmentId: tenant.development.id };
}

async function send(tenant: Tenant, overrides: Partial<SendEmailRequestInput> = {}) {
  const provider = new FakeEmailProvider({ log: false });
  const service = createEmailService({
    liveProvider: provider,
    sandboxProvider: provider,
    trackingBaseUrl: `${BASE}/`,
  });
  const { email } = await service.send({
    environment: sendEnvironment(tenant.development),
    apiKeyId: null,
    params: params({ html: HTML, ...overrides }),
  });
  const html = provider.sent.at(-1)?.html ?? null;
  return { email, html, urls: trackingUrls(html ?? "") };
}

/** The token and link position a tracking URL names. */
function parts(url: string): { token: string; position: number } {
  const [, token = "", position = "-1"] = /\/t\/[oc]\/([^/]+)(?:\/(\d+))?$/.exec(url) ?? [];
  return { token, position: Number(position) };
}

describe("resolving settings", () => {
  test("off by default: the HTML goes out untouched", async () => {
    const tenant = await createTestTenant();
    const { email, html } = await send(tenant);
    expect(html).toBe(HTML);
    expect(email.tracking).toEqual({
      opens: false,
      clicks: false,
      open_count: 0,
      first_opened_at: null,
      last_opened_at: null,
      click_count: 0,
      first_clicked_at: null,
      last_clicked_at: null,
    });
    const [row] = await db.select().from(schema.email).where(eq(schema.email.id, email.id));
    expect(row?.trackingToken).toBeNull();
  });

  test("per send beats the category rule, which beats the environment default", async () => {
    const tenant = await createTestTenant();
    const env = envOf(tenant);
    await upsertTrackingRule(env, { category: null, opens: true, clicks: true });
    await upsertTrackingRule(env, { category: "receipts", opens: false, clicks: false });

    expect((await send(tenant)).email.tracking).toMatchObject({ opens: true, clicks: true });
    expect((await send(tenant, { category: "receipts" })).email.tracking).toMatchObject({
      opens: false,
      clicks: false,
    });
    expect((await send(tenant, { category: "other" })).email.tracking).toMatchObject({
      opens: true,
      clicks: true,
    });
    expect(
      (await send(tenant, { category: "receipts", tracking: { clicks: true } })).email.tracking,
    ).toMatchObject({ opens: false, clicks: true });
  });

  test("rules upsert per category and are deleted per environment", async () => {
    const tenant = await createTestTenant();
    const other = await createTestTenant();
    const env = envOf(tenant);
    const first = await upsertTrackingRule(env, { category: null, opens: true, clicks: false });
    const again = await upsertTrackingRule(env, { category: null, opens: false, clicks: true });
    expect(again?.id).toBe(first?.id ?? "");
    await upsertTrackingRule(env, { category: "news", opens: true, clicks: true });
    const settings = await getTrackingSettings(env);
    expect(settings.default).toMatchObject({ opens: false, clicks: true });
    expect(settings.categories.map((rule) => rule.category)).toEqual(["news"]);

    expect(
      await upsertTrackingRule(
        { ...envOf(other), environmentId: tenant.development.id },
        {
          category: null,
          opens: true,
          clicks: true,
        },
      ),
    ).toBeNull();
    expect(await deleteTrackingRule(envOf(other), first?.id ?? "")).toBe(false);
    expect(await deleteTrackingRule(env, first?.id ?? "")).toBe(true);
    expect((await getTrackingSettings(env)).default).toBeNull();
  });

  test("settings changes never affect an email already sent", async () => {
    const tenant = await createTestTenant();
    const { email, urls } = await send(tenant, { tracking: { opens: true, clicks: false } });
    await upsertTrackingRule(envOf(tenant), { category: null, opens: false, clicks: false });
    expect(urls.clicks).toEqual([]);
    expect(await recordOpen({ token: parts(urls.open ?? "").token, userAgent: null })).toBe(true);
    const current = await getEmail({ ...envOf(tenant), id: email.id });
    expect(current?.tracking).toMatchObject({ opens: true, clicks: false, open_count: 1 });
  });
});

describe("recording hits", () => {
  test("opens and clicks record events, counts, links and webhooks", async () => {
    const tenant = await createTestTenant();
    const env = envOf(tenant);
    await createWebhookEndpoint(
      { ...env, url: "https://example.com/hook", eventTypes: [], userId: null },
      testManagementDeps,
    );
    const { email, html, urls } = await send(tenant, { tracking: { opens: true, clicks: true } });
    expect(urls.open).toStartWith(`${BASE}/t/o/`);
    expect(urls.clicks).toHaveLength(2);
    expect(html).not.toContain("acme.com/one");

    const now = new Date("2026-01-01T00:00:00Z");
    const open = parts(urls.open ?? "");
    expect(await recordOpen({ ...open, userAgent: "Mail/1.0", now })).toBe(true);
    // The same minute collapses; the next one counts again.
    expect(await recordOpen({ ...open, userAgent: "Mail/1.0", now })).toBe(false);
    const later = new Date(now.getTime() + 120_000);
    expect(await recordOpen({ ...open, userAgent: null, now: later })).toBe(true);

    const second = parts(urls.clicks[1] ?? "");
    expect(await recordClick({ ...second, userAgent: "Browser", now })).toBe(
      "https://acme.com/two",
    );
    expect(await recordClick({ ...second, userAgent: "Browser", now })).toBe(
      "https://acme.com/two",
    );

    const current = await getEmail({ ...env, id: email.id });
    expect(current?.tracking).toEqual({
      opens: true,
      clicks: true,
      open_count: 2,
      first_opened_at: now.toISOString(),
      last_opened_at: later.toISOString(),
      click_count: 1,
      first_clicked_at: now.toISOString(),
      last_clicked_at: now.toISOString(),
    });
    // Engagement never moves a recipient's delivery status.
    expect(current?.recipients[0]?.status).toBe("delivered");

    const links = await listEmailLinks({ ...env, emailId: email.id });
    expect(links?.links.map((link) => [link.url, link.click_count])).toEqual([
      ["https://acme.com/one", 0],
      ["https://acme.com/two", 1],
    ]);

    const events = await listEmailEvents({ ...env, emailId: email.id });
    const engagement = events?.events.filter((event) =>
      ["email.opened", "email.clicked"].includes(event.type),
    );
    expect(engagement?.map((event) => [event.type, event.recipient])).toEqual([
      ["email.opened", "user@example.com"],
      ["email.clicked", "user@example.com"],
      ["email.opened", "user@example.com"],
    ]);
    expect(engagement?.[1]?.data).toEqual({
      click: { url: "https://acme.com/two", link_position: 1, user_agent: "Browser" },
    });

    const messages = await db
      .select()
      .from(schema.webhookMessage)
      .where(
        and(
          eq(schema.webhookMessage.organizationId, env.organizationId),
          eq(schema.webhookMessage.type, "email.clicked"),
        ),
      );
    expect(messages).toHaveLength(1);
    const payload = EmailWebhookEvent.parse(messages[0]?.payload);
    expect(payload.data).toMatchObject({
      email_id: email.id,
      recipient: "user@example.com",
      click: { url: "https://acme.com/two", link_position: 1 },
    });
  });

  test("hits on emails with several recipients are not attributed", async () => {
    const tenant = await createTestTenant();
    await addSuppression(envOf(tenant), { address: "gone@example.com", scope: "*" });
    const single = await send(tenant, {
      to: ["a@example.com", "gone@example.com"],
      tracking: { opens: true },
    });
    const many = await send(tenant, {
      to: "a@example.com",
      cc: "b@example.com",
      tracking: { opens: true },
    });
    for (const { urls } of [single, many]) {
      await recordOpen({ token: parts(urls.open ?? "").token, userAgent: null });
    }
    const recipientOf = async (emailId: string) =>
      (await listEmailEvents({ ...envOf(tenant), emailId }))?.events.find(
        (event) => event.type === "email.opened",
      )?.recipient;
    expect(await recipientOf(single.email.id)).toBe("a@example.com");
    expect(await recipientOf(many.email.id)).toBeNull();
  });

  test("unknown tokens, links and disabled kinds record nothing", async () => {
    const tenant = await createTestTenant();
    const { email, urls } = await send(tenant, { tracking: { opens: false, clicks: true } });
    const { token } = parts(urls.clicks[0] ?? "");
    expect(await recordOpen({ token, userAgent: null })).toBe(false);
    expect(await recordClick({ token, position: 9, userAgent: null })).toBeNull();
    expect(await recordClick({ token, position: -1, userAgent: null })).toBeNull();
    expect(await recordClick({ token: "x".repeat(32), position: 0, userAgent: null })).toBeNull();
    expect(await recordClick({ token: "not a token", position: 0, userAgent: null })).toBeNull();
    const current = await getEmail({ ...envOf(tenant), id: email.id });
    expect(current?.tracking).toMatchObject({ open_count: 0, click_count: 0 });
  });

  test("text-only emails are never instrumented", async () => {
    const tenant = await createTestTenant();
    const { email, html } = await send(tenant, {
      html: undefined,
      text: "https://acme.com",
      tracking: { opens: true, clicks: true },
    });
    expect(html).toBeNull();
    expect((await listEmailLinks({ ...envOf(tenant), emailId: email.id }))?.links).toEqual([]);
  });

  test("links of another organization's email are not listed", async () => {
    const tenant = await createTestTenant();
    const other = await createTestTenant();
    const { email } = await send(tenant, { tracking: { clicks: true } });
    expect(await listEmailLinks({ ...envOf(other), emailId: email.id })).toBeNull();
  });

  test("a tracked send without a tracking base URL fails loudly", async () => {
    const tenant = await createTestTenant();
    const provider = new FakeEmailProvider({ log: false });
    const service = createEmailService({ liveProvider: provider, sandboxProvider: provider });
    await expect(
      service.send({
        environment: sendEnvironment(tenant.development),
        apiKeyId: null,
        params: params({ html: HTML, tracking: { opens: true } }),
      }),
    ).rejects.toThrow("trackingBaseUrl");
  });
});
