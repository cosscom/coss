import { describe, expect, test } from "bun:test";
import { createTestTenant } from "@coss/tenancy/testing";
import { EmailError } from "../src/errors.ts";
import { ingestProviderEvents } from "../src/events.ts";
import { FakeEmailProvider } from "../src/providers/fake.ts";
import { listEmailSummariesPage } from "../src/read.ts";
import { CreateSuppressionRequest } from "../src/schemas.ts";
import { createEmailService } from "../src/service.ts";
import { createSubaccount, subaccountStats, updateSubaccount } from "../src/subaccounts.ts";
import { addSuppression, checkSuppression, listSuppressions } from "../src/suppressions.ts";
import { dispatchingEmailService, memoryDispatchQueue } from "../src/testing.ts";
import { createTopic } from "../src/topics.ts";
import { params, sendEnvironment } from "./helpers.ts";

type Tenant = Awaited<ReturnType<typeof createTestTenant>>;

function envOf(tenant: Tenant, subaccountId?: string) {
  return {
    organizationId: tenant.organization.id,
    environmentId: tenant.development.id,
    ...(subaccountId ? { subaccountId } : {}),
  };
}

async function setup() {
  const tenant = await createTestTenant();
  const a = await createSubaccount({ ...envOf(tenant), name: "A", uid: "user_a" });
  const b = await createSubaccount({ ...envOf(tenant), name: "B", uid: "user_b" });
  const provider = new FakeEmailProvider({ log: false });
  const service = dispatchingEmailService({ liveProvider: provider, sandboxProvider: provider });
  const send = (overrides: Parameters<typeof params>[0] = {}) =>
    service.send({
      environment: sendEnvironment(tenant.development),
      apiKeyId: null,
      params: params(overrides),
    });
  return { tenant, a, b, send };
}

function suppress(env: ReturnType<typeof envOf>, address: string) {
  return addSuppression(env, CreateSuppressionRequest.parse({ address }));
}

function bounce(emailId: string, address: string) {
  return {
    provider: "fake",
    providerEventType: "Bounce",
    emailId,
    providerMessageId: null,
    type: "email.bounced" as const,
    recipients: [address],
    occurredAt: new Date(),
    sourceId: crypto.randomUUID(),
    data: { bounce: { type: "permanent" as const, sub_type: "General", diagnostic_code: null } },
  };
}

describe("sending for sub-accounts", () => {
  test("an email names its sub-account by id or uid", async () => {
    const { a, send } = await setup();
    const byUid = await send({ subaccount: "user_a" });
    const byId = await send({ subaccount: a.id });
    expect(byUid.email.subaccount_id).toBe(a.id);
    expect(byId.email.subaccount_id).toBe(a.id);
    expect((await send()).email.subaccount_id).toBeNull();
  });

  test("unknown, disabled and deleting sub-accounts are refused", async () => {
    const { tenant, a, send } = await setup();
    const unknown = await send({ subaccount: "nobody" }).catch((error) => error);
    expect(unknown).toBeInstanceOf(EmailError);
    expect(unknown).toMatchObject({ code: "subaccount_not_found", param: "subaccount" });

    await updateSubaccount({
      organizationId: tenant.organization.id,
      id: a.id,
      status: "disabled",
    });
    const disabled = await send({ subaccount: "user_a" }).catch((error) => error);
    expect(disabled).toMatchObject({ code: "subaccount_disabled", status: 403 });
  });

  test("a sub-account turned off after a send was accepted stops it at the claim", async () => {
    const tenant = await createTestTenant();
    const a = await createSubaccount({ ...envOf(tenant), name: "A", uid: "user_a" });
    const provider = new FakeEmailProvider({ log: false });
    const queue = memoryDispatchQueue();
    const service = createEmailService({
      liveProvider: provider,
      sandboxProvider: provider,
      queue,
    });
    const { email } = await service.send({
      environment: sendEnvironment(tenant.development),
      apiKeyId: null,
      params: params({ subaccount: "user_a" }),
    });
    expect(email.status).toBe("queued");
    await updateSubaccount({
      organizationId: tenant.organization.id,
      id: a.id,
      status: "disabled",
    });
    await queue.drain(service);
    expect(provider.sent.find((message) => message.emailId === email.id)).toBeUndefined();
    const [row] = await listEmailSummariesPage({ ...envOf(tenant), limit: 1 }).then((page) =>
      page.data.filter((summary) => summary.id === email.id),
    );
    expect(row?.status).toBe("failed");
  });

  test("each sub-account has its own suppression list; the environment's applies to all", async () => {
    const { tenant, a, b, send } = await setup();
    await suppress(envOf(tenant, a.id), "only-a@example.com");
    await suppress(envOf(tenant), "everyone@example.com");

    const forA = await send({
      subaccount: "user_a",
      to: ["only-a@example.com", "everyone@example.com", "fine@example.com"],
    });
    expect(Object.fromEntries(forA.email.recipients.map((r) => [r.address, r.status]))).toEqual({
      "only-a@example.com": "suppressed",
      "everyone@example.com": "suppressed",
      "fine@example.com": "delivered",
    });
    const forB = await send({ subaccount: "user_b", to: ["only-a@example.com"] });
    expect(forB.email.recipients[0]?.status).toBe("delivered");
    // The environment's own sends never see a sub-account's list.
    const own = await send({ to: ["only-a@example.com"] });
    expect(own.email.recipients[0]?.status).toBe("delivered");

    expect(
      (await checkSuppression(envOf(tenant, b.id), { address: "everyone@example.com" })).suppressed,
    ).toBe(true);
    expect(
      (await checkSuppression(envOf(tenant, b.id), { address: "only-a@example.com" })).suppressed,
    ).toBe(false);
    expect((await listSuppressions(envOf(tenant))).data.map((s) => s.address)).toEqual([
      "everyone@example.com",
    ]);
  });

  test("a sub-account's bounces go on its own list only", async () => {
    const { tenant, a, send } = await setup();
    const { email } = await send({ subaccount: "user_a", to: ["gone@example.com"] });
    await ingestProviderEvents([bounce(email.id, "gone@example.com")]);

    expect((await listSuppressions(envOf(tenant, a.id))).data).toMatchObject([
      { address: "gone@example.com", reason: "bounce", subaccount_id: a.id },
    ]);
    expect((await listSuppressions(envOf(tenant))).data).toEqual([]);
    expect(
      (await send({ subaccount: "user_a", to: ["gone@example.com"] })).email.recipients[0],
    ).toMatchObject({ status: "suppressed" });
    expect(
      (await send({ subaccount: "user_b", to: ["gone@example.com"] })).email.recipients[0],
    ).toMatchObject({ status: "delivered" });
  });

  test("a sub-account's email about an environment topic keeps its own unsubscribe", async () => {
    const tenant = await createTestTenant();
    await createSubaccount({ ...envOf(tenant), name: "A", uid: "user_a" });
    await createTopic(envOf(tenant), { key: "news", name: "News", default_subscription: "opt_in" });
    const provider = new FakeEmailProvider({ log: false });
    const service = dispatchingEmailService({
      liveProvider: provider,
      sandboxProvider: provider,
      trackingBaseUrl: "https://track.test",
    });
    const send = (overrides: Parameters<typeof params>[0]) =>
      service.send({
        environment: sendEnvironment(tenant.development),
        apiKeyId: null,
        params: params({ to: ["one@example.com"], category: "news", ...overrides }),
      });
    const header = (emailId: string) =>
      provider.sent.find((message) => message.emailId === emailId)?.headers["List-Unsubscribe"];
    // The environment's own email leads to its preference center (`/t/u/a…`); the sub-account's
    // keeps one-click unsubscribe's own link, which suppresses for that sub-account only.
    const own = await send({});
    expect(header(own.email.id)).toMatch(/\/t\/u\/a.+>$/);
    const forA = await send({ subaccount: "user_a", tracking: { unsubscribe: true } });
    expect(header(forA.email.id)).toMatch(/^<https:\/\/track\.test\/t\/u\/[A-Za-z0-9_-]{32}>$/);
  });

  test("emails list by sub-account, and stats count its recipients per day", async () => {
    const { tenant, a, send } = await setup();
    await suppress(envOf(tenant, a.id), "skip@example.com");
    await send({ subaccount: "user_a", to: ["one@example.com", "skip@example.com"] });
    await send({ subaccount: "user_b" });

    const page = await listEmailSummariesPage({
      ...envOf(tenant),
      subaccountId: a.id,
      limit: 10,
    });
    expect(page.data.map((row) => row.subaccount_id)).toEqual([a.id]);

    const stats = await subaccountStats({
      organizationId: tenant.organization.id,
      subaccountId: a.id,
    });
    expect(stats.data).toHaveLength(1);
    expect(stats.data[0]).toMatchObject({
      recipients: 2,
      sent: 1,
      delivered: 1,
      suppressed: 1,
      bounced: 0,
    });
  });
});
