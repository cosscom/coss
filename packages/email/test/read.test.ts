import { describe, expect, test } from "bun:test";
import { db, schema } from "@coss/db";
import { newId } from "@coss/db/id";
import { createTestTenant } from "@coss/tenancy/testing";
import { and, eq } from "drizzle-orm";
import { EMAIL_CSV_COLUMNS, emailsCsvStream } from "../src/email-csv.ts";
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

  test("filters by recipient, tag, category, sender domain and creation time", async () => {
    const tenant = await createTestTenant();
    const environment = sendEnvironment(tenant.development);
    const send = async (overrides: Parameters<typeof params>[0]) =>
      (await service.send({ environment, apiKeyId: null, params: params(overrides) })).email;
    await send({
      subject: "A",
      from: "hello@acme.com",
      to: "ann@example.com",
      tags: [{ name: "template", value: "welcome" }],
      category: "onboarding",
    });
    await send({
      subject: "B",
      from: '"Support @ Acme" <help@mail.ACME.com>',
      to: "bob@example.com",
      cc: "Ann@Example.com",
      tags: [{ name: "template", value: "digest" }],
      category: "marketing",
    });
    const old = await send({ subject: "C", from: "hi@notacme.com", bcc: "ann@example.com" });
    await db
      .update(schema.email)
      .set({ createdAt: new Date("2026-01-10T12:00:00Z") })
      .where(
        and(eq(schema.email.id, old.id), eq(schema.email.organizationId, tenant.organization.id)),
      );

    const list = async (filters: EmailListFilters) =>
      (
        await listEmails({
          organizationId: tenant.organization.id,
          environmentId: tenant.development.id,
          ...filters,
        })
      ).map((e) => e.subject);

    // Recipients: to, cc and bcc, exact and case-insensitive.
    expect(await list({ recipient: " ANN@example.com " })).toEqual(["B", "A", "C"]);
    expect(await list({ recipient: "ann@example" })).toEqual([]);
    expect(await list({ tag: { name: "template" } })).toEqual(["B", "A"]);
    expect(await list({ tag: { name: "template", value: "welcome" } })).toEqual(["A"]);
    expect(await list({ tag: { name: "template", value: "nope" } })).toEqual([]);
    expect(await list({ category: "marketing" })).toEqual(["B"]);
    expect(await list({ category: "%" })).toEqual([]);
    // The domain and its subdomains, never a domain that merely ends the same way.
    expect(await list({ senderDomain: "Acme.com" })).toEqual(["B", "A"]);
    expect(await list({ senderDomain: "@mail.acme.com" })).toEqual(["B"]);
    expect(await list({ senderDomain: "cme.com" })).toEqual([]);
    expect(await list({ senderDomain: "notacme.com" })).toEqual(["C"]);
    expect(
      await list({
        createdAfter: new Date("2026-01-10T00:00:00Z"),
        createdBefore: new Date("2026-01-11T00:00:00Z"),
      }),
    ).toEqual(["C"]);
    expect(await list({ createdBefore: new Date("2026-01-10T12:00:00Z") })).toEqual([]);
    expect(await list({ createdAfter: new Date("2026-01-11T00:00:00Z") })).toEqual(["B", "A"]);
    expect(await list({ recipient: "ann@example.com", category: "onboarding" })).toEqual(["A"]);
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

describe("emailsCsvStream", () => {
  test("exports every matching email across pages, guarding formula cells", async () => {
    const tenant = await createTestTenant();
    const environment = sendEnvironment(tenant.development);
    await service.send({
      environment,
      apiKeyId: null,
      params: params({
        subject: "=HYPERLINK(1)",
        to: ['"Doe, Jane" <jane@example.com>', "joe@example.com"],
        tags: [{ name: "template", value: "welcome" }],
        category: "onboarding",
      }),
    });
    await service.send({ environment, apiKeyId: null, params: params({ subject: "Other" }) });
    const scope = { organizationId: tenant.organization.id, environmentId: tenant.development.id };

    const csv = await new Response(emailsCsvStream({ ...scope, category: "onboarding" })).text();
    const [header, row, end] = csv.split("\r\n");
    expect(header).toBe(EMAIL_CSV_COLUMNS.join(","));
    expect(end).toBe("");
    expect(row).toContain(`"""Doe, Jane"" <jane@example.com>; joe@example.com"`);
    expect(row).toContain(",'=HYPERLINK(1),onboarding,template:welcome,");
    expect(row).toContain("jane@example.com (delivered); joe@example.com (delivered)");
    expect(row).not.toContain("Hello!");

    const all = await new Response(emailsCsvStream(scope)).text();
    expect(all.split("\r\n")).toHaveLength(4);
    // A page cursor never narrows an export.
    const cursor = (await listEmails({ ...scope, limit: 1 }))[0]?.id;
    expect(
      (await new Response(emailsCsvStream({ ...scope, before: cursor })).text()).split("\r\n"),
    ).toHaveLength(4);
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
