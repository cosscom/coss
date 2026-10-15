import { describe, expect, test } from "bun:test";
import { newId } from "@coss/db/id";
import { createTestTenant } from "@coss/tenancy/testing";
import { FakeEmailProvider } from "../src/providers/fake.ts";
import {
  type EmailListFilters,
  emailActivity,
  environmentsWithSentEmail,
  getEmail,
  listEmails,
  listEmailsPage,
} from "../src/read.ts";
import { dispatchingEmailService } from "../src/testing.ts";
import { params, sendEnvironment, verifiedFrom } from "./helpers.ts";

const provider = new FakeEmailProvider({ log: false });
const service = dispatchingEmailService({ liveProvider: provider, sandboxProvider: provider });

describe("getEmail", () => {
  test("is scoped to the organization and environment", async () => {
    const tenant = await createTestTenant();
    const other = await createTestTenant();
    const { email: sandboxed } = await service.send({
      environment: sendEnvironment(tenant.development),
      apiKeyId: null,
      params: params(),
    });
    const { email: live } = await service.send({
      environment: sendEnvironment(tenant.production),
      apiKeyId: null,
      params: params({ from: await verifiedFrom(tenant.organization.id) }),
    });

    const org = tenant.organization.id;
    expect(
      await getEmail({
        organizationId: org,
        environmentId: tenant.development.id,
        id: sandboxed.id,
      }),
    ).toEqual({ ...sandboxed, sandbox: true });
    expect(
      await getEmail({ organizationId: org, environmentId: tenant.production.id, id: live.id }),
    ).toMatchObject({ id: live.id, sandbox: false });

    // Other environment, other organization, unknown and malformed ids.
    expect(
      await getEmail({
        organizationId: org,
        environmentId: tenant.production.id,
        id: sandboxed.id,
      }),
    ).toBeNull();
    expect(
      await getEmail({
        organizationId: other.organization.id,
        environmentId: tenant.development.id,
        id: sandboxed.id,
      }),
    ).toBeNull();
    for (const id of [newId("email"), "email_123", "nope", newId("key"), ""]) {
      expect(
        await getEmail({ organizationId: org, environmentId: tenant.development.id, id }),
      ).toBeNull();
    }
  });
});

describe("listEmails", () => {
  test("lists an environment's emails newest first", async () => {
    const tenant = await createTestTenant();
    const other = await createTestTenant();
    const environment = sendEnvironment(tenant.development);
    const sent = [];
    for (const subject of ["One", "Two", "Three"]) {
      sent.push(
        (await service.send({ environment, apiKeyId: null, params: params({ subject }) })).email,
      );
    }
    await service.send({
      environment: sendEnvironment(tenant.production),
      apiKeyId: null,
      params: params({ subject: "Live", from: await verifiedFrom(tenant.organization.id) }),
    });

    const org = tenant.organization.id;
    const listed = await listEmails({ organizationId: org, environmentId: tenant.development.id });
    expect(listed.map((e) => e.subject)).toEqual(["Three", "Two", "One"]);
    expect(listed.every((e) => e.sandbox)).toBe(true);
    // Exactly what the table shows: never the content, headers, recipients or attachments.
    const newest = sent[2];
    if (!newest) throw new Error("unreachable");
    expect(listed[0]).toEqual({
      id: newest.id,
      to: newest.to,
      subject: newest.subject,
      status: newest.status,
      sandbox: true,
      tracking: newest.tracking,
      created_at: newest.created_at,
      scheduled_at: newest.scheduled_at,
    });

    expect(
      await listEmails({ organizationId: org, environmentId: tenant.development.id, limit: 2 }),
    ).toHaveLength(2);
    expect(
      await listEmails({ organizationId: org, environmentId: tenant.development.id, limit: 0 }),
    ).toHaveLength(1);
    expect(
      (await listEmails({ organizationId: org, environmentId: tenant.production.id })).map((e) => [
        e.subject,
        e.sandbox,
      ]),
    ).toEqual([["Live", false]]);
    expect(
      await listEmails({
        organizationId: other.organization.id,
        environmentId: tenant.development.id,
      }),
    ).toEqual([]);
  });
});

describe("listEmails filters and listEmailsPage", () => {
  test("filters by status and by subject or recipient, escaping LIKE wildcards", async () => {
    const tenant = await createTestTenant();
    const environment = sendEnvironment(tenant.development);
    const send = (overrides: Parameters<typeof params>[0]) =>
      service.send({ environment, apiKeyId: null, params: params(overrides) });
    await send({ subject: "Invoice 100% paid", to: "billing@example.com" });
    await send({ subject: "Invoice 1000 paid", to: "billing@example.com" });
    await send({ subject: "Welcome", to: "Ann@Example.org" });
    await send({
      subject: "Later",
      scheduled_at: new Date(Date.now() + 86_400_000).toISOString(),
    });

    const list = async (filters: EmailListFilters) =>
      (
        await listEmails({
          organizationId: tenant.organization.id,
          environmentId: tenant.development.id,
          ...filters,
        })
      ).map((e) => e.subject);

    expect(await list({ query: "100%" })).toEqual(["Invoice 100% paid"]);
    expect(await list({ query: "invoice" })).toEqual(["Invoice 1000 paid", "Invoice 100% paid"]);
    expect(await list({ query: "ann@example" })).toEqual(["Welcome"]);
    expect(await list({ query: "_" })).toEqual([]);
    expect(await list({ status: ["scheduled"] })).toEqual(["Later"]);
    expect(await list({ status: ["sent"], query: "welcome" })).toEqual(["Welcome"]);
    expect(await list({ status: [] })).toHaveLength(4);
  });

  test("pages newest first with an email id as the cursor", async () => {
    const tenant = await createTestTenant();
    const other = await createTestTenant();
    const environment = sendEnvironment(tenant.development);
    for (const subject of ["1", "2", "3", "4", "5"]) {
      await service.send({ environment, apiKeyId: null, params: params({ subject }) });
    }
    const scope = { organizationId: tenant.organization.id, environmentId: tenant.development.id };

    const first = await listEmailsPage({ ...scope, limit: 2 });
    expect(first.items.map((e) => e.subject)).toEqual(["5", "4"]);
    expect(first.nextCursor).toBe(first.items[1]?.id ?? "missing");
    const second = await listEmailsPage({ ...scope, limit: 2, before: first.nextCursor ?? "" });
    expect(second.items.map((e) => e.subject)).toEqual(["3", "2"]);
    const last = await listEmailsPage({ ...scope, limit: 2, before: second.nextCursor ?? "" });
    expect(last).toMatchObject({ nextCursor: null });
    expect(last.items.map((e) => e.subject)).toEqual(["1"]);
    expect((await listEmailsPage({ ...scope, limit: 5 })).nextCursor).toBeNull();

    // A cursor of another environment or organization matches nothing.
    const foreign = await service.send({
      environment: sendEnvironment(other.development),
      apiKeyId: null,
      params: params(),
    });
    expect((await listEmailsPage({ ...scope, before: foreign.email.id })).items).toEqual([]);
  });
});

describe("emailActivity", () => {
  test("counts an environment's emails per UTC day by status, with engagement", async () => {
    const service = dispatchingEmailService({
      liveProvider: provider,
      sandboxProvider: provider,
      trackingBaseUrl: "https://track.example.com",
    });
    const tenant = await createTestTenant();
    const environment = sendEnvironment(tenant.development);
    await service.send({ environment, apiKeyId: null, params: params() });
    await service.send({
      environment,
      apiKeyId: null,
      params: params({ tracking: { opens: true, clicks: true } }),
    });
    await service.send({
      environment,
      apiKeyId: null,
      params: params({ scheduled_at: new Date(Date.now() + 86_400_000).toISOString() }),
    });
    await service.send({
      environment: sendEnvironment(tenant.production),
      apiKeyId: null,
      params: params({ from: await verifiedFrom(tenant.organization.id) }),
    });

    const now = new Date(Date.now() + 1000);
    const activity = await emailActivity({
      organizationId: tenant.organization.id,
      environmentId: tenant.development.id,
      since: new Date(now.getTime() - 2 * 86_400_000),
      now,
    });
    expect(activity.days).toHaveLength(3);
    expect(activity.days.at(-1)).toMatchObject({
      date: new Date().toISOString().slice(0, 10),
      sent: 2,
      scheduled: 1,
      failed: 0,
    });
    expect(activity.days[0]).toMatchObject({ sent: 0, scheduled: 0 });
    expect(activity.totals).toMatchObject({
      sent: 2,
      scheduled: 1,
      queued: 0,
      trackedOpens: 1,
      opened: 0,
      trackedClicks: 1,
      clicked: 0,
    });
  });
});

describe("environmentsWithSentEmail", () => {
  test("names the environments of the organization that have sent an email", async () => {
    const tenant = await createTestTenant();
    const other = await createTestTenant();
    const org = tenant.organization.id;
    const ids = [tenant.production.id, tenant.development.id];
    expect(await environmentsWithSentEmail({ organizationId: org, environmentIds: ids })).toEqual(
      new Set(),
    );

    // A failed send doesn't count.
    const failing = dispatchingEmailService({
      liveProvider: new FakeEmailProvider({ log: false, fail: () => true }),
      sandboxProvider: provider,
    });
    const from = await verifiedFrom(org);
    const { email: failed } = await failing.send({
      environment: sendEnvironment(tenant.production),
      apiKeyId: null,
      params: params({ from }),
    });
    expect(
      (await getEmail({ organizationId: org, environmentId: tenant.production.id, id: failed.id }))
        ?.status,
    ).toBe("failed");
    expect(await environmentsWithSentEmail({ organizationId: org, environmentIds: ids })).toEqual(
      new Set(),
    );

    await service.send({
      environment: sendEnvironment(tenant.production),
      apiKeyId: null,
      params: params({ from }),
    });
    expect(await environmentsWithSentEmail({ organizationId: org, environmentIds: ids })).toEqual(
      new Set([tenant.production.id]),
    );
    // Scoped to the organization, and to the ids asked about.
    expect(
      await environmentsWithSentEmail({
        organizationId: other.organization.id,
        environmentIds: ids,
      }),
    ).toEqual(new Set());
    expect(
      await environmentsWithSentEmail({
        organizationId: org,
        environmentIds: [tenant.development.id],
      }),
    ).toEqual(new Set());
    expect(await environmentsWithSentEmail({ organizationId: org, environmentIds: [] })).toEqual(
      new Set(),
    );
  });
});
