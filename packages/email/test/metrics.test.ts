import { describe, expect, test } from "bun:test";
import { db, schema } from "@coss/db";
import { createTestTenant } from "@coss/tenancy/testing";
import { eq, sql } from "drizzle-orm";
import { ingestProviderEvents } from "../src/events.ts";
import { mailboxProviderOf } from "../src/mailbox-providers.ts";
import { emailMetrics, emailMetricsRange, sendingDomainOf } from "../src/metrics.ts";
import { FakeEmailProvider } from "../src/providers/fake.ts";
import { purgeExpiredEmailMetrics } from "../src/retention.ts";
import type { SendEmailRequestInput } from "../src/schemas.ts";
import { createEmailService } from "../src/service.ts";
import { addSuppression } from "../src/suppressions.ts";
import { sweepStaleClaims } from "../src/sweeps.ts";
import { dispatchingEmailService, memoryDispatchQueue, trackingUrls } from "../src/testing.ts";
import { recordClick, recordOpen } from "../src/tracking.ts";
import { gatedProvider, params, sendEnvironment, verifiedFrom } from "./helpers.ts";

type Tenant = Awaited<ReturnType<typeof createTestTenant>>;

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

function today() {
  const end = new Date(Math.ceil(Date.now() / DAY_MS) * DAY_MS);
  return { start: new Date(end.getTime() - DAY_MS), end, granularity: "day" as const };
}

function metricsOf(tenant: Tenant, environmentId = tenant.production.id) {
  return (query: Partial<Parameters<typeof emailMetrics>[0]> = {}) =>
    emailMetrics({
      organizationId: tenant.organization.id,
      environmentId,
      ...today(),
      ...query,
    });
}

async function sendLive(tenant: Tenant, overrides: Partial<SendEmailRequestInput>) {
  const provider = new FakeEmailProvider({ log: false });
  const service = dispatchingEmailService({ liveProvider: provider, sandboxProvider: provider });
  return service.send({
    environment: sendEnvironment(tenant.production),
    apiKeyId: null,
    params: params({ from: await verifiedFrom(tenant.organization.id), ...overrides }),
  });
}

describe("mailbox providers", () => {
  test("by the address's domain", () => {
    expect(mailboxProviderOf("a@gmail.com")).toBe("gmail");
    expect(mailboxProviderOf("a@googlemail.com")).toBe("gmail");
    expect(mailboxProviderOf("a@hotmail.co.uk")).toBe("outlook");
    expect(mailboxProviderOf("a@outlook.de")).toBe("outlook");
    expect(mailboxProviderOf("a@yahoo.com.br")).toBe("yahoo");
    expect(mailboxProviderOf("a@aol.com")).toBe("yahoo");
    expect(mailboxProviderOf("a@me.com")).toBe("icloud");
    expect(mailboxProviderOf("a@pm.me")).toBe("proton");
    expect(mailboxProviderOf("a@web.de")).toBe("gmx");
    expect(mailboxProviderOf("A@GMAIL.COM")).toBe("gmail");
    expect(mailboxProviderOf("a@acme.com")).toBe("other");
    expect(mailboxProviderOf("a@outlook.acme.com")).toBe("other");
    expect(mailboxProviderOf("a@mail.gmail.com")).toBe("other");
  });

  test("sending domain", () => {
    expect(sendingDomainOf("Acme <Hello@Mail.Acme.com>")).toBe("mail.acme.com");
    expect(sendingDomainOf("hello@acme.com")).toBe("acme.com");
    expect(sendingDomainOf("not an address")).toBe("");
  });
});

describe("ranges", () => {
  const now = new Date("2026-10-15T10:30:00Z");

  test("defaults to the last 7 days, or 24 hours by hour, in whole buckets", () => {
    expect(emailMetricsRange({ granularity: "day", now })).toEqual({
      start: new Date("2026-10-09T00:00:00Z"),
      end: new Date("2026-10-16T00:00:00Z"),
    });
    expect(emailMetricsRange({ granularity: "hour", now })).toEqual({
      start: new Date("2026-10-14T11:00:00Z"),
      end: new Date("2026-10-15T11:00:00Z"),
    });
  });

  test("rounds out to buckets and refuses empty or long ranges", () => {
    expect(
      emailMetricsRange({
        granularity: "day",
        from: new Date("2026-10-01T12:00:00Z"),
        to: new Date("2026-10-03T01:00:00Z"),
      }),
    ).toEqual({ start: new Date("2026-10-01T00:00:00Z"), end: new Date("2026-10-04T00:00:00Z") });
    expect(emailMetricsRange({ granularity: "day", from: now, to: now })).toBeNull();
    expect(
      emailMetricsRange({ granularity: "hour", from: new Date(now.getTime() - 8 * DAY_MS), now }),
    ).toBeNull();
    expect(
      emailMetricsRange({ granularity: "day", from: new Date(now.getTime() - 401 * DAY_MS), now }),
    ).toBeNull();
  });
});

describe("counting", () => {
  test("sent, delivered, bounced and complained per recipient, by every dimension", async () => {
    const tenant = await createTestTenant();
    await addSuppression(
      { organizationId: tenant.organization.id, environmentId: tenant.production.id },
      { address: "gone@gmail.com", scope: "*" },
    );
    await sendLive(tenant, {
      to: ["ann@gmail.com", "bob@hotmail.com", "gone@gmail.com"],
      category: "welcome",
      tags: [
        { name: "campaign", value: "spring" },
        { name: "plan", value: "pro" },
      ],
    });
    await sendLive(tenant, {
      to: ["bounce@simulator.amazonses.com", "complaint@simulator.amazonses.com"],
      tags: [{ name: "campaign", value: "spring" }],
    });
    const metrics = metricsOf(tenant);

    const all = await metrics();
    expect(all.totals).toEqual({
      sent: 4,
      delivered: 3,
      bounced: 1,
      complained: 1,
      opened: 0,
      clicked: 0,
    });
    expect(all.series).toHaveLength(1);
    expect(all.series[0]?.group).toBeNull();
    expect(all.series[0]?.buckets).toEqual([
      { start: today().start.toISOString(), end: today().end.toISOString(), ...all.totals },
    ]);
    expect(all.has_more).toBe(false);

    const byProvider = await metrics({ groupBy: "mailbox_provider" });
    expect(byProvider.series.map((s) => [s.group, s.totals.sent, s.totals.delivered])).toEqual([
      ["other", 2, 1],
      ["gmail", 1, 1],
      ["outlook", 1, 1],
    ]);

    const byCategory = await metrics({ groupBy: "category" });
    // Ties on `sent` go to the larger `delivered`.
    expect(byCategory.series.map((s) => [s.group, s.totals.sent, s.totals.delivered])).toEqual([
      ["welcome", 2, 2],
      [null, 2, 1],
    ]);

    const byDomain = await metrics({ groupBy: "domain" });
    // Each send came from a domain of its own.
    expect(byDomain.series.map((s) => s.totals.sent)).toEqual([2, 2]);
    expect(byDomain.series.every((s) => s.group?.includes("."))).toBe(true);

    // Tags overlap: the totals still count each recipient once.
    const byTag = await metrics({ groupBy: "tag" });
    expect(byTag.series.map((s) => [s.group, s.totals.sent])).toEqual([
      ["campaign:spring", 4],
      ["plan:pro", 2],
    ]);
    expect(byTag.totals.sent).toBe(4);

    const tagged = await metrics({
      tag: { name: "plan", value: "pro" },
      groupBy: "mailbox_provider",
    });
    expect(tagged.totals).toMatchObject({ sent: 2, delivered: 2, bounced: 0 });
    expect(tagged.series.map((s) => s.group)).toEqual(["gmail", "outlook"]);

    expect((await metrics({ category: ["welcome"] })).totals.sent).toBe(2);
    expect((await metrics({ mailboxProvider: ["gmail", "outlook"] })).totals.sent).toBe(2);
    expect((await metrics({ domain: ["nowhere.test"] })).totals.sent).toBe(0);

    const limited = await metrics({ groupBy: "mailbox_provider", limit: 1 });
    expect(limited.series.map((s) => s.group)).toEqual(["other"]);
    expect(limited.has_more).toBe(true);
    expect(limited.totals.sent).toBe(4);
  });

  test("hour buckets are zero-filled; environments and sandbox are counted apart", async () => {
    const tenant = await createTestTenant();
    const provider = new FakeEmailProvider({ log: false });
    const service = dispatchingEmailService({ liveProvider: provider, sandboxProvider: provider });
    await service.send({
      environment: sendEnvironment(tenant.development),
      apiKeyId: null,
      params: params({ to: "ann@gmail.com" }),
    });
    const end = new Date(Math.ceil(Date.now() / HOUR_MS) * HOUR_MS);
    const hourly = await metricsOf(
      tenant,
      tenant.development.id,
    )({
      start: new Date(end.getTime() - 3 * HOUR_MS),
      end,
      granularity: "hour",
    });
    expect(hourly.series[0]?.buckets.map((b) => b.sent)).toEqual([0, 0, 1]);
    expect(hourly.totals).toMatchObject({ sent: 1, delivered: 1 });
    expect((await metricsOf(tenant)()).totals.sent).toBe(0);
  });

  test("an email counts as sent once, whichever path gets it there", async () => {
    const tenant = await createTestTenant();
    const gated = gatedProvider("fake");
    const service = dispatchingEmailService({
      liveProvider: gated.provider,
      sandboxProvider: gated.provider,
    });
    const sending = service.send({
      environment: sendEnvironment(tenant.production),
      apiKeyId: null,
      params: params({ from: await verifiedFrom(tenant.organization.id), to: ["a@gmail.com"] }),
    });
    await gated.called;
    const emailId = gated.sent[0]?.emailId ?? "";
    const sent = {
      provider: "fake",
      providerEventType: "Send",
      emailId,
      providerMessageId: "fake_event",
      type: "email.sent" as const,
      recipients: null,
      occurredAt: new Date(),
      sourceId: "fake_event",
      data: {},
    };
    await ingestProviderEvents([sent]);
    gated.release();
    await sending;
    await ingestProviderEvents([{ ...sent, sourceId: "again" }]);
    expect((await metricsOf(tenant)()).totals.sent).toBe(1);
  });

  test("the stale-claim sweep counts what it resolves as sent", async () => {
    const tenant = await createTestTenant();
    const gated = gatedProvider("fake");
    const service = dispatchingEmailService({
      liveProvider: gated.provider,
      sandboxProvider: gated.provider,
    });
    void service.send({
      environment: sendEnvironment(tenant.production),
      apiKeyId: null,
      params: params({ from: await verifiedFrom(tenant.organization.id) }),
    });
    await gated.called;
    const emailId = gated.sent[0]?.emailId ?? "";
    await db.insert(schema.emailEvent).values({
      organizationId: tenant.organization.id,
      environmentId: tenant.production.id,
      emailId,
      type: "email.sent",
      provider: "fake",
      providerEventType: "Send",
      recipient: null,
      occurredAt: new Date(),
      dedupeKey: "sweep-test",
      details: {},
    });
    await db
      .update(schema.email)
      .set({ updatedAt: sql`now() - interval '1 hour'` })
      .where(eq(schema.email.id, emailId));
    await sweepStaleClaims({ scope: { organizationIds: [tenant.organization.id] } });
    expect((await metricsOf(tenant)()).totals.sent).toBe(1);
    gated.release();
  });

  test("a failed send counts nothing", async () => {
    const tenant = await createTestTenant();
    const provider = new FakeEmailProvider({ log: false, fail: () => true });
    const service = dispatchingEmailService({ liveProvider: provider, sandboxProvider: provider });
    await service.send({
      environment: sendEnvironment(tenant.production),
      apiKeyId: null,
      params: params({ from: await verifiedFrom(tenant.organization.id) }),
    });
    const { totals } = await metricsOf(tenant)();
    expect(Object.values(totals).every((value) => value === 0)).toBe(true);
  });
});

describe("opens and clicks", () => {
  async function sendTracked(tenant: Tenant, to: string[]) {
    const provider = new FakeEmailProvider({ log: false });
    const queue = memoryDispatchQueue();
    const service = createEmailService({
      liveProvider: provider,
      sandboxProvider: provider,
      trackingBaseUrl: "https://api.coss.test/",
      queue,
    });
    await service.send({
      environment: sendEnvironment(tenant.development),
      apiKeyId: null,
      params: params({
        to,
        html: '<p>Hi <a href="https://acme.com/one">1</a><a href="https://acme.com/two">2</a></p>',
        tracking: { opens: true, clicks: true },
      }),
    });
    await queue.drain(service);
    const urls = trackingUrls(provider.sent.at(-1)?.html ?? "");
    const token = (url: string) => /\/t\/[oc]\/([^/]+)/.exec(url)?.[1] ?? "";
    return { open: token(urls.open ?? ""), click: token(urls.clicks[0] ?? "") };
  }

  test("each email counts once as opened and once as clicked", async () => {
    const tenant = await createTestTenant();
    const single = await sendTracked(tenant, ["ann@gmail.com"]);
    const shared = await sendTracked(tenant, ["ann@gmail.com", "bob@outlook.com"]);
    const tomorrow = new Date(Date.now() + DAY_MS);
    for (const hit of [single, shared]) {
      await recordOpen({ token: hit.open, userAgent: null });
      await recordOpen({ token: hit.open, userAgent: null, now: tomorrow });
      await recordClick({ token: hit.click, position: 0, userAgent: null });
      await recordClick({ token: hit.click, position: 1, userAgent: null });
    }
    const metrics = metricsOf(tenant, tenant.development.id);
    expect((await metrics()).totals).toMatchObject({ opened: 2, clicked: 2 });
    // Only the single-recipient email's open can be tied to a provider.
    const byProvider = await metrics({ groupBy: "mailbox_provider" });
    const opened = Object.fromEntries(byProvider.series.map((s) => [s.group, s.totals.opened]));
    expect(opened).toEqual({ gmail: 1, outlook: 0, null: 1 });
    expect((await metrics({ mailboxProvider: ["gmail"] })).totals.opened).toBe(1);
  });
});

describe("retention", () => {
  test("purges hours past the retention period", async () => {
    const tenant = await createTestTenant();
    await sendLive(tenant, { to: "ann@gmail.com" });
    const scope = { organizationIds: [tenant.organization.id] };
    expect(await purgeExpiredEmailMetrics({ scope })).toBe(0);
    expect(
      await purgeExpiredEmailMetrics({ scope, now: new Date(Date.now() + 401 * DAY_MS) }),
    ).toBeGreaterThan(0);
    expect((await metricsOf(tenant)()).totals.sent).toBe(0);
  });
});
