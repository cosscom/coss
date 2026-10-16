import { describe, expect, test } from "bun:test";
import { db, schema } from "@coss/db";
import { uniqueSuffix } from "@coss/db/testing";
import { createTestTenant } from "@coss/tenancy/testing";
import { and, eq } from "drizzle-orm";
import {
  applyTenantStatus,
  authorizeLiveSender,
  checkDomain,
  createDomain,
  deleteDomain,
  ensureMissingStreamTenants,
  releaseOrganizationEmailResources,
  restartDomainVerification,
} from "../src/domains.ts";
import { EmailError } from "../src/errors.ts";
import { ingestProviderEvents } from "../src/events.ts";
import type { OutboundEmail } from "../src/provider.ts";
import { IdentityTakenError, ThrottledSendError, UncertainSendError } from "../src/provider.ts";
import { FakeTrackingHostnameProvider } from "../src/providers/fake-tracking-hostnames.ts";
import { getEmail } from "../src/read.ts";
import { createEmailRuntime } from "../src/runtime.ts";
import { SesIdentityProvider } from "../src/ses/identity.ts";
import { encodeAddress, encodeWords } from "../src/ses/mime.ts";
import { parseSesMessage } from "../src/ses/parse.ts";
import { SesEmailProvider } from "../src/ses/provider.ts";
import { sweepStaleClaims } from "../src/sweeps.ts";
import { dispatchingEmailService, FakeSesApi } from "../src/testing.ts";
import { params, sendEnvironment } from "./helpers.ts";

const config = {
  region: "eu-west-1",
  configurationSets: { transactional: "coss-test", marketing: "coss-test-marketing" },
  tenantPrefix: "test",
};

function outbound(overrides: Partial<OutboundEmail> = {}): OutboundEmail {
  return {
    emailId: "email_01k7c8m4q2f3e9v6t5r1n0p8yz",
    organizationId: "org_01k7c8m4q2f3e9v6t5r1n0p8yz",
    stream: "transactional",
    from: "Acme <hello@acme.com>",
    to: ["a@example.com"],
    cc: [],
    bcc: [],
    replyTo: [],
    subject: "Hi",
    html: "<p>Hi</p>",
    text: null,
    headers: {},
    tags: [{ name: "kind", value: "welcome" }],
    attachments: [],
    ...overrides,
  };
}

describe("encodeAddress", () => {
  test("keeps ASCII names and encodes others as RFC 2047 words", () => {
    expect(encodeAddress("hello@acme.com")).toBe("hello@acme.com");
    expect(encodeAddress("Acme <hello@acme.com>")).toBe("Acme <hello@acme.com>");
    expect(encodeAddress('"Acme, Inc." <hello@acme.com>')).toBe('"Acme, Inc." <hello@acme.com>');
    expect(encodeAddress("Zoë <zoe@acme.com>")).toBe("=?UTF-8?B?Wm/Dqw==?= <zoe@acme.com>");
    expect(encodeAddress('"Zoë, Ltd" <zoe@acme.com>')).toBe(
      `${encodeWords("Zoë, Ltd")} <zoe@acme.com>`,
    );
  });

  test("splits long names into words of at most 75 characters", () => {
    const words = encodeWords("é".repeat(60)).split(" ");
    expect(words.length).toBeGreaterThan(1);
    expect(words.every((word) => word.length <= 75)).toBe(true);
    const decoded = words
      .map((word) => Buffer.from(word.slice(10, -2), "base64").toString("utf8"))
      .join("");
    expect(decoded).toBe("é".repeat(60));
  });
});

describe("SesEmailProvider", () => {
  test("sends with the tenant, configuration set and only the email id tag", async () => {
    const api = new FakeSesApi();
    const provider = new SesEmailProvider(api, config);

    const result = await provider.send(
      outbound({
        to: ["A <a@example.com>", "Zoë <z@example.com>"],
        cc: ["a@EXAMPLE.com", "c@example.com"],
        bcc: ["c@example.com", "d@example.com"],
        replyTo: ["support@acme.com"],
        text: "Hi",
        headers: { "x-campaign": "fall" },
      }),
    );

    expect(result).toEqual({ providerMessageId: "ses-1" });
    expect(api.sent[0]).toEqual({
      FromEmailAddress: "Acme <hello@acme.com>",
      Destination: {
        ToAddresses: ["A <a@example.com>", "=?UTF-8?B?Wm/Dqw==?= <z@example.com>"],
        CcAddresses: ["c@example.com"],
        BccAddresses: ["d@example.com"],
      },
      ReplyToAddresses: ["support@acme.com"],
      Content: {
        Simple: {
          Subject: { Data: "Hi", Charset: "UTF-8" },
          Body: {
            Html: { Data: "<p>Hi</p>", Charset: "UTF-8" },
            Text: { Data: "Hi", Charset: "UTF-8" },
          },
          Headers: [{ Name: "x-campaign", Value: "fall" }],
        },
      },
      ConfigurationSetName: "coss-test",
      TenantName: "test-org_01k7c8m4q2f3e9v6t5r1n0p8yz",
      EmailTags: [{ Name: "coss_email_id", Value: "email_01k7c8m4q2f3e9v6t5r1n0p8yz" }],
    });
  });

  test("hands attachments to SES, inline ones with their content id", async () => {
    const api = new FakeSesApi();
    const provider = new SesEmailProvider(api, config);
    const pdf = new TextEncoder().encode("%PDF-1.7");
    const png = new Uint8Array([137, 80, 78, 71]);

    await provider.send(
      outbound({
        html: '<p>Hi <img src="cid:logo@acme"></p>',
        attachments: [
          {
            filename: "invoice.pdf",
            contentType: "application/pdf",
            contentId: null,
            content: pdf,
          },
          { filename: "logo.png", contentType: "image/png", contentId: "logo@acme", content: png },
        ],
      }),
    );

    expect(api.sent[0]?.Content?.Simple?.Attachments).toEqual([
      {
        RawContent: pdf,
        FileName: "invoice.pdf",
        ContentType: "application/pdf",
        ContentTransferEncoding: "BASE64",
        ContentDisposition: "ATTACHMENT",
      },
      {
        RawContent: png,
        FileName: "logo.png",
        ContentType: "image/png",
        ContentTransferEncoding: "BASE64",
        ContentDisposition: "INLINE",
        ContentId: "logo@acme",
      },
    ]);
  });

  test("retries throttling only", async () => {
    const api = new FakeSesApi();
    const provider = new SesEmailProvider(api, config, { sleep: async () => {} });
    api.fail("sendEmail", "TooManyRequestsException", 2);
    expect((await provider.send(outbound())).providerMessageId).toBe("ses-1");
    expect(api.operations()).toEqual(["sendEmail", "sendEmail", "sendEmail"]);

    api.fail("sendEmail", "TooManyRequestsException", 3);
    await expect(provider.send(outbound())).rejects.toThrow(ThrottledSendError);
    api.fail("sendEmail", "MessageRejected");
    await expect(provider.send(outbound())).rejects.toThrow("MessageRejected");
    expect(api.operations()).toHaveLength(7);
  });

  test("tells refused requests apart from ones SES may have accepted", async () => {
    const api = new FakeSesApi();
    const provider = new SesEmailProvider(api, config, { sleep: async () => {} });
    const refused = [
      Object.assign(new Error("Email address is not verified."), { name: "MessageRejected" }),
      Object.assign(new Error("Bad"), { name: "SomethingNew", $metadata: { httpStatusCode: 400 } }),
    ];
    for (const error of refused) {
      api.failures.set("sendEmail", [error]);
      const thrown = await provider.send(outbound()).catch((e: unknown) => e);
      expect(thrown).toBe(error);
    }
    const uncertain = [
      Object.assign(new Error("Socket timed out"), { name: "TimeoutError" }),
      Object.assign(new Error("read ECONNRESET"), { code: "ECONNRESET", $metadata: {} }),
      Object.assign(new Error("Internal"), {
        name: "InternalFailure",
        $metadata: { httpStatusCode: 500 },
      }),
    ];
    for (const error of uncertain) {
      api.failures.set("sendEmail", [error]);
      const thrown = await provider.send(outbound()).catch((e: unknown) => e);
      expect(thrown).toBeInstanceOf(UncertainSendError);
      expect((thrown as Error).cause).toBe(error);
    }
  });
});

describe("SES send outcomes (fake SES)", () => {
  async function sesService() {
    const tenant = await createTestTenant();
    const organizationId = tenant.organization.id;
    const api = new FakeSesApi();
    const runtime = createEmailRuntime({
      provider: "ses",
      ses: { ...config, tenantPrefix: `t${uniqueSuffix()}`.slice(0, 32) },
      sesApi: api,
      dns: null,
      log: false,
    });
    const name = `t-${uniqueSuffix()}.coss.test`;
    const domain = await createDomain({ organizationId, name, userId: null }, runtime.domainDeps);
    api.verify(name);
    await checkDomain({ organizationId, id: domain.id }, runtime.domainDeps);
    const service = dispatchingEmailService(runtime);
    const send = async () =>
      (
        await service.send({
          environment: sendEnvironment(tenant.production),
          apiKeyId: null,
          params: params({ from: `Acme <hello@${name}>`, to: ["a@example.com"] }),
        })
      ).email;
    const row = async (id: string) =>
      (await db.select().from(schema.email).where(eq(schema.email.id, id)))[0];
    return { tenant, api, send, row };
  }

  async function ingest(record: unknown) {
    const parsed = parseSesMessage(JSON.stringify(record));
    if (parsed.kind !== "events") throw new Error("expected events");
    await ingestProviderEvents(parsed.events);
  }

  test("a timeout leaves the email claimed: SES's Send event settles it, else the sweep", async () => {
    const { tenant, api, send, row } = await sesService();
    const scope = { organizationIds: [tenant.organization.id] };

    api.failures.set("sendEmail", [
      Object.assign(new Error("Socket timed out"), { name: "TimeoutError" }),
    ]);
    const accepted = await send();
    // Not failed, not sent again: claimed until SES tells.
    expect(accepted.status).toBe("queued");
    expect(await row(accepted.id)).toMatchObject({ provider: "ses", errorCode: null });
    expect(api.operations().filter((op) => op === "sendEmail")).toHaveLength(1);
    const mail = { ...MAIL, messageId: "ses-late", tags: { coss_email_id: [accepted.id] } };
    await ingest({ eventType: "Send", mail, send: {} });
    expect(await row(accepted.id)).toMatchObject({
      status: "sent",
      providerMessageId: "ses-late",
      usageRecordedAt: expect.any(Date),
    });

    // Never heard of: the stale-claim sweep fails it, repairably.
    api.failures.set("sendEmail", [
      Object.assign(new Error("read ECONNRESET"), { code: "ECONNRESET" }),
    ]);
    const lost = await send();
    expect(lost.status).toBe("queued");
    expect(await sweepStaleClaims({ now: new Date(Date.now() + 16 * 60_000), scope })).toBe(1);
    expect(await row(lost.id)).toMatchObject({
      status: "failed",
      errorCode: "dispatch_interrupted",
      usageRecordedAt: null,
    });
  });

  test("a refused send fails at once, and a Send event would still repair it", async () => {
    const { api, send, row } = await sesService();
    api.fail("sendEmail", "MessageRejected");
    const refused = await send();
    expect(refused.status).toBe("failed");
    expect(await row(refused.id)).toMatchObject({ errorCode: "provider_error" });
    const mail = { ...MAIL, messageId: "ses-odd", tags: { coss_email_id: [refused.id] } };
    await ingest({ eventType: "Send", mail, send: {} });
    expect(await row(refused.id)).toMatchObject({ status: "sent", errorCode: null });
  });

  test("a Reject after Send fails the email", async () => {
    const { send, row } = await sesService();
    const email = await send();
    expect(email.status).toBe("sent");
    const providerMessageId = (await row(email.id))?.providerMessageId;
    const mail = { ...MAIL, messageId: providerMessageId, tags: { coss_email_id: [email.id] } };
    await ingest({ eventType: "Send", mail, send: {} });
    await ingest({ eventType: "Reject", mail, reject: { reason: "Bad content" } });
    const failed = await row(email.id);
    expect(failed).toMatchObject({ status: "failed", errorCode: "rejected" });
    if (!failed) throw new Error("no email");
    const after = await getEmail({
      organizationId: failed.organizationId,
      environmentId: failed.environmentId,
      id: email.id,
    });
    expect(after?.recipients.map((r) => r.status)).toEqual(["failed"]);
  });
});

describe("streams", () => {
  test("a marketing email goes out with the marketing configuration set and tenant", async () => {
    const api = new FakeSesApi();
    await new SesEmailProvider(api, config).send(outbound({ stream: "marketing" }));
    expect(api.sent[0]).toMatchObject({
      ConfigurationSetName: "coss-test-marketing",
      TenantName: "test-org_01k7c8m4q2f3e9v6t5r1n0p8yz-marketing",
    });
  });

  test("each stream's tenant is associated with only its configuration set", async () => {
    const api = new FakeSesApi();
    const identity = new SesIdentityProvider(api, config);
    const marketing = await identity.ensureTenant({ organizationId: "org_a", stream: "marketing" });
    expect(marketing.tenantName).toBe("test-org_a-marketing");
    const set = (name: string) => `arn:aws:ses:eu-west-1:123456789012:configuration-set/${name}`;
    expect(api.associations.get(set("coss-test-marketing"))).toEqual(
      new Set(["test-org_a-marketing"]),
    );
    expect(api.associations.get(set("coss-test"))?.has("test-org_a-marketing") ?? false).toBe(
      false,
    );
  });

  test("an identity is shared by the organization's own tenants, never another's", async () => {
    const api = new FakeSesApi();
    const identity = new SesIdentityProvider(api, config);
    const own = [
      await identity.ensureTenant({ organizationId: "org_a", stream: "transactional" }),
      await identity.ensureTenant({ organizationId: "org_a", stream: "marketing" }),
    ];
    await identity.createDomainIdentity({
      tenants: own,
      domain: "acme.com",
      mailFromDomain: "send.acme.com",
    });
    expect(api.associations.get(api.identityArn("acme.com"))).toEqual(
      new Set(["test-org_a", "test-org_a-marketing"]),
    );
    // Provisioning again (a restarted verification) finds only its own tenants: adopted.
    await identity.createDomainIdentity({
      tenants: own,
      domain: "acme.com",
      mailFromDomain: "send.acme.com",
    });
    const other = await identity.ensureTenant({ organizationId: "org_b", stream: "marketing" });
    await expect(
      identity.createDomainIdentity({
        tenants: [other],
        domain: "acme.com",
        mailFromDomain: "send.acme.com",
      }),
    ).rejects.toBeInstanceOf(IdentityTakenError);

    await identity.deleteDomainIdentity({ tenants: own, domain: "acme.com" });
    expect(api.associations.get(api.identityArn("acme.com"))?.size).toBe(0);
  });

  test("the backfill creates missing stream tenants with the organization's identities", async () => {
    const api = new FakeSesApi();
    const identity = new SesIdentityProvider(api, config);
    const deps = { identity, dns: null, tracking: new FakeTrackingHostnameProvider() };
    const tenant = await createTestTenant();
    const organizationId = tenant.organization.id;
    const name = `streams-${uniqueSuffix()}.com`;
    await createDomain({ organizationId, name, userId: null }, deps);
    // An organization set up before streams: only its transactional tenant exists.
    await db
      .delete(schema.emailTenant)
      .where(
        and(
          eq(schema.emailTenant.organizationId, organizationId),
          eq(schema.emailTenant.stream, "marketing"),
        ),
      );
    api.tenants.delete(`test-${organizationId}-marketing`);
    api.associations.get(api.identityArn(name))?.delete(`test-${organizationId}-marketing`);

    const scope = { organizationIds: [organizationId] };
    expect(await ensureMissingStreamTenants(identity, { scope })).toBe(1);
    expect(api.associations.get(api.identityArn(name))).toEqual(
      new Set([`test-${organizationId}`, `test-${organizationId}-marketing`]),
    );
    const rows = await db
      .select()
      .from(schema.emailTenant)
      .where(eq(schema.emailTenant.organizationId, organizationId));
    const marketing = rows.find((row) => row.stream === "marketing");
    expect(marketing).toMatchObject({ tenantName: `test-${organizationId}-marketing` });
    // Born without SES suppression: bootstrap's migration must skip it.
    expect(marketing?.suppressionMigratedAt).not.toBeNull();
    expect(await ensureMissingStreamTenants(identity, { scope })).toBe(0);
  });

  test("an organization's first domain on an orphaned identity still gets new keys", async () => {
    const api = new FakeSesApi();
    const identity = new SesIdentityProvider(api, config);
    const deps = { identity, dns: null, tracking: new FakeTrackingHostnameProvider() };
    const tenant = await createTestTenant();
    const name = `orphan-${uniqueSuffix()}.com`;
    // Left behind by coss.com (e.g. a deleted organization's), tagged as ours.
    await api.createEmailIdentity({
      EmailIdentity: name,
      Tags: [{ Key: "coss_managed", Value: "test" }],
    });
    const oldTokens = api.identities.get(name)?.tokens;
    // Creating this organization's tenants must not associate it before the ownership check.
    const created = await createDomain(
      { organizationId: tenant.organization.id, name, userId: null },
      deps,
    );
    expect(created.dkimTokens).not.toEqual(oldTokens);
    expect(api.operations()).toContain("deleteEmailIdentity");
  });

  test("restarting a domain another organization took never associates it first", async () => {
    const api = new FakeSesApi();
    const identity = new SesIdentityProvider(api, config);
    const deps = { identity, dns: null, tracking: new FakeTrackingHostnameProvider() };
    const a = await createTestTenant();
    const b = await createTestTenant();
    const name = `restart-${uniqueSuffix()}.com`;
    const created = await createDomain(
      { organizationId: a.organization.id, name, userId: null },
      deps,
    );
    // A's claim failed and its associations are gone; it has no marketing tenant (pre-streams).
    await db
      .update(schema.domain)
      .set({ status: "failed" })
      .where(eq(schema.domain.id, created.id));
    api.associations.get(api.identityArn(name))?.clear();
    await db
      .delete(schema.emailTenant)
      .where(
        and(
          eq(schema.emailTenant.organizationId, a.organization.id),
          eq(schema.emailTenant.stream, "marketing"),
        ),
      );
    api.tenants.delete(`test-${a.organization.id}-marketing`);
    // B claims the name; its claim fails too while B's tenants still hold the identity. Then A
    // restarts its failed domain (which keeps its old DKIM tokens).
    const taken = await createDomain(
      { organizationId: b.organization.id, name, userId: null },
      deps,
    );
    await db.update(schema.domain).set({ status: "failed" }).where(eq(schema.domain.id, taken.id));
    await expect(
      restartDomainVerification({ organizationId: a.organization.id, id: created.id }, deps),
    ).rejects.toMatchObject({ code: "domain_taken" });
    expect([...(api.associations.get(api.identityArn(name)) ?? [])].sort()).toEqual(
      [`test-${b.organization.id}`, `test-${b.organization.id}-marketing`].sort(),
    );
  });

  test("a stream tenant created later gets every existing domain, and a half-made one is kept", async () => {
    const api = new FakeSesApi();
    const identity = new SesIdentityProvider(api, config);
    const deps = { identity, dns: null, tracking: new FakeTrackingHostnameProvider() };
    const tenant = await createTestTenant();
    const organizationId = tenant.organization.id;
    const first = `streams-${uniqueSuffix()}.com`;
    await createDomain({ organizationId, name: first, userId: null }, deps);
    const dropMarketingRow = () =>
      db
        .delete(schema.emailTenant)
        .where(
          and(
            eq(schema.emailTenant.organizationId, organizationId),
            eq(schema.emailTenant.stream, "marketing"),
          ),
        );
    // Set up before streams: no marketing tenant, and the first domain only on the transactional one.
    await dropMarketingRow();
    api.tenants.delete(`test-${organizationId}-marketing`);
    api.associations.get(api.identityArn(first))?.delete(`test-${organizationId}-marketing`);

    // A new domain creates the marketing tenant, which gets the older domain too.
    const second = `streams-${uniqueSuffix()}.com`;
    await createDomain({ organizationId, name: second, userId: null }, deps);
    const both = new Set([`test-${organizationId}`, `test-${organizationId}-marketing`]);
    expect(api.associations.get(api.identityArn(first))).toEqual(both);
    expect(api.associations.get(api.identityArn(second))).toEqual(both);

    // A run that created the SES tenant but failed before its row: the backfill stores it.
    await dropMarketingRow();
    const scope = { organizationIds: [organizationId] };
    expect(await ensureMissingStreamTenants(identity, { scope })).toBe(1);
    expect(api.associations.get(api.identityArn(first))).toEqual(both);

    // A domain the old release associated with the transactional tenant only: the rerun adds it.
    api.associations.get(api.identityArn(second))?.delete(`test-${organizationId}-marketing`);
    expect(await ensureMissingStreamTenants(identity, { scope })).toBe(0);
    expect(api.associations.get(api.identityArn(second))).toEqual(both);
  });
});

describe("SesIdentityProvider", () => {
  test("creates the tenant once, with SES suppression off and the configuration set", async () => {
    const api = new FakeSesApi();
    const identity = new SesIdentityProvider(api, config);

    const tenant = await identity.ensureTenant({
      organizationId: "org_a",
      stream: "transactional",
    });
    expect(tenant).toEqual({
      tenantName: "test-org_a",
      tenantArn: "arn:aws:ses:eu-west-1:123456789012:tenant/test-org_a/t-1",
    });
    expect(api.calls[0]?.input).toMatchObject({
      SuppressionAttributes: { SuppressionScope: "TENANT", SuppressedReasons: [] },
    });
    expect(
      api.associations.get("arn:aws:ses:eu-west-1:123456789012:configuration-set/coss-test"),
    ).toEqual(new Set(["test-org_a"]));

    expect(
      await identity.ensureTenant({ organizationId: "org_a", stream: "transactional" }),
    ).toEqual(tenant);
    // Runtime setup must not disable protection before bootstrap migrates the old list.
    expect(api.calls.some((call) => call.operation === "putTenantSuppressionAttributes")).toBe(
      false,
    );
  });

  test("creates domain identities with MAIL FROM, associated with the tenant", async () => {
    const api = new FakeSesApi();
    const identity = new SesIdentityProvider(api, config);
    const tenant = await identity.ensureTenant({
      organizationId: "org_a",
      stream: "transactional",
    });

    const created = await identity.createDomainIdentity({
      tenants: [tenant],
      domain: "acme.com",
      mailFromDomain: "send.acme.com",
    });

    expect(created).toEqual({
      dkimTokens: api.identities.get("acme.com")?.tokens ?? [],
      dkimHostedZone: "dkim.amazonses.com",
      region: "eu-west-1",
    });
    expect(api.calls.find((c) => c.operation === "createEmailIdentity")?.input).toMatchObject({
      ConfigurationSetName: "coss-test",
      DkimSigningAttributes: { NextSigningKeyLength: "RSA_2048_BIT" },
      Tags: [{ Key: "coss_managed", Value: "test" }],
    });
    expect(api.identities.get("acme.com")?.mailFrom).toBe("send.acme.com");
    expect(api.associations.get(api.identityArn("acme.com"))).toEqual(new Set(["test-org_a"]));

    expect(await identity.getDomainIdentity("acme.com")).toMatchObject({
      status: "pending",
      canSend: false,
      mailFromStatus: "pending",
    });
    api.verify("acme.com");
    expect(await identity.getDomainIdentity("acme.com")).toMatchObject({
      status: "verified",
      canSend: true,
      mailFromStatus: "success",
    });
    expect(await identity.getDomainIdentity("unknown.com")).toBeNull();

    await identity.deleteDomainIdentity({ tenants: [tenant], domain: "acme.com" });
    expect(api.identities.has("acme.com")).toBe(false);
    expect(api.associations.get(api.identityArn("acme.com"))?.size).toBe(0);
    // Already gone: still fine.
    await identity.deleteDomainIdentity({ tenants: [tenant], domain: "acme.com" });
  });

  test("never adopts another tenant's identity; recreates orphans with new keys", async () => {
    const api = new FakeSesApi();
    const identity = new SesIdentityProvider(api, config);
    const a = await identity.ensureTenant({ organizationId: "org_a", stream: "transactional" });
    const b = await identity.ensureTenant({ organizationId: "org_b", stream: "transactional" });
    await identity.createDomainIdentity({
      tenants: [a],
      domain: "acme.com",
      mailFromDomain: "send.acme.com",
    });

    await expect(
      identity.createDomainIdentity({
        tenants: [b],
        domain: "acme.com",
        mailFromDomain: "send.acme.com",
      }),
    ).rejects.toBeInstanceOf(IdentityTakenError);

    // An identity coss.com created, left behind without a tenant: recreated with new keys.
    await api.createEmailIdentity({
      EmailIdentity: "orphan.com",
      Tags: [{ Key: "coss_managed", Value: "test" }],
    });
    const oldTokens = api.identities.get("orphan.com")?.tokens;
    const recreated = await identity.createDomainIdentity({
      tenants: [b],
      domain: "orphan.com",
      mailFromDomain: "send.orphan.com",
    });
    expect(recreated.dkimTokens).not.toEqual(oldTokens);
    expect(api.operations()).toContain("deleteEmailIdentity");
  });

  test("never touches identities managed outside coss.com (or by another deployment)", async () => {
    const api = new FakeSesApi();
    const identity = new SesIdentityProvider(api, config);
    const tenant = await identity.ensureTenant({
      organizationId: "org_a",
      stream: "transactional",
    });
    // The company's own domain, verified by hand in the same account.
    await api.createEmailIdentity({ EmailIdentity: "company.com" });
    await api.createEmailIdentity({
      EmailIdentity: "staging.com",
      Tags: [{ Key: "coss_managed", Value: "staging" }],
    });
    const tokens = api.identities.get("company.com")?.tokens;

    for (const domain of ["company.com", "staging.com"]) {
      await expect(
        identity.createDomainIdentity({
          tenants: [tenant],
          domain,
          mailFromDomain: `send.${domain}`,
        }),
      ).rejects.toBeInstanceOf(IdentityTakenError);
      await identity.deleteDomainIdentity({ tenants: [tenant], domain });
    }
    expect(api.identities.get("company.com")?.tokens).toEqual(tokens ?? []);
    expect(api.identities.has("staging.com")).toBe(true);
    expect(api.operations()).not.toContain("deleteEmailIdentity");
    expect(api.identities.get("company.com")?.mailFrom).toBeNull();
  });
});

describe("releaseOrganizationEmailResources", () => {
  test("stops between provider operations when claim ownership is lost", async () => {
    const api = new FakeSesApi();
    const identity = new SesIdentityProvider(api, config);
    const deps = { identity, dns: null, tracking: new FakeTrackingHostnameProvider() };
    const tenant = await createTestTenant();
    const organizationId = tenant.organization.id;
    const name = `lease-${uniqueSuffix()}.com`;
    const domain = await createDomain({ organizationId, name, userId: null }, deps);
    await expect(
      releaseOrganizationEmailResources(organizationId, deps, async () => {
        if (!api.identities.has(name)) throw new Error("Claim lost");
      }),
    ).rejects.toThrow("Claim lost");
    expect(api.tenants.has(`test-${organizationId}`)).toBe(true);
    expect(
      await db
        .select({ id: schema.domain.id })
        .from(schema.domain)
        .where(eq(schema.domain.id, domain.id)),
    ).toHaveLength(1);
    await releaseOrganizationEmailResources(organizationId, deps);
    expect(api.tenants.has(`test-${organizationId}`)).toBe(false);
  });

  test("removes the organization's identities, domains and SES tenant", async () => {
    const api = new FakeSesApi();
    const identity = new SesIdentityProvider(api, config);
    const deps = { identity, dns: null, tracking: new FakeTrackingHostnameProvider() };
    const tenant = await createTestTenant();
    const organizationId = tenant.organization.id;
    const name = `release-${uniqueSuffix()}.com`;
    await createDomain({ organizationId, name, userId: null }, deps);
    // A failed domain whose name another organization holds by now: its identity isn't ours.
    const other = await identity.ensureTenant({
      organizationId: "org_other",
      stream: "transactional",
    });
    const taken = `taken-${uniqueSuffix()}.com`;
    await identity.createDomainIdentity({
      tenants: [other],
      domain: taken,
      mailFromDomain: `send.${taken}`,
    });
    await db.insert(schema.domain).values({
      organizationId,
      name: taken,
      status: "failed",
      provider: "ses",
      mailFromDomain: `send.${taken}`,
    });

    await releaseOrganizationEmailResources(organizationId, deps);
    expect(api.identities.has(name)).toBe(false);
    expect(api.identities.has(taken)).toBe(true);
    expect(api.tenants.has(`test-${organizationId}`)).toBe(false);
    expect(api.tenants.has("test-org_other")).toBe(true);
    const domains = await db
      .select({ id: schema.domain.id })
      .from(schema.domain)
      .where(eq(schema.domain.organizationId, organizationId));
    expect(domains).toEqual([]);
    const tenants = await db
      .select({ id: schema.emailTenant.organizationId })
      .from(schema.emailTenant)
      .where(eq(schema.emailTenant.organizationId, organizationId));
    expect(tenants).toEqual([]);
    // Idempotent: a retry after a crash finds nothing left to do.
    await releaseOrganizationEmailResources(organizationId, deps);
  });

  test("a provider failure leaves the rest for the retry, with sending stopped", async () => {
    const api = new FakeSesApi();
    const identity = new SesIdentityProvider(api, config);
    const deps = { identity, dns: null, tracking: new FakeTrackingHostnameProvider() };
    const tenant = await createTestTenant();
    const organizationId = tenant.organization.id;
    const name = `retry-${uniqueSuffix()}.com`;
    await createDomain({ organizationId, name, userId: null }, deps);
    api.fail("deleteEmailIdentity", "ThrottlingException");

    await expect(releaseOrganizationEmailResources(organizationId, deps)).rejects.toThrow();
    const [row] = await db
      .select({ status: schema.domain.status, canSend: schema.domain.canSend })
      .from(schema.domain)
      .where(eq(schema.domain.name, name));
    expect(row).toEqual({ status: "deleting", canSend: false });
    expect(api.tenants.has(`test-${organizationId}`)).toBe(true);

    await releaseOrganizationEmailResources(organizationId, deps);
    expect(api.identities.has(name)).toBe(false);
    expect(api.tenants.has(`test-${organizationId}`)).toBe(false);
  });

  test("never deletes another deployment's tenant", async () => {
    const api = new FakeSesApi();
    const staging = new SesIdentityProvider(api, { ...config, tenantPrefix: "staging" });
    const tenant = await staging.ensureTenant({ organizationId: "org_a", stream: "transactional" });
    await new SesIdentityProvider(api, config).deleteTenant(tenant);
    expect(api.tenants.has("staging-org_a")).toBe(true);
    await staging.deleteTenant(tenant);
    expect(api.tenants.has("staging-org_a")).toBe(false);
    // Already gone: still fine.
    await staging.deleteTenant(tenant);
  });
});

const MAIL = {
  timestamp: "2026-10-10T12:00:00.000Z",
  source: "hello@acme.com",
  messageId: "0102019a-ses-message",
  destination: ["a@example.com", "b@example.com"],
  tags: { coss_email_id: ["email_01k7c8m4q2f3e9v6t5r1n0p8yz"], "ses:configuration-set": ["coss"] },
};

describe("parseSesMessage", () => {
  test("Send is about the whole message", () => {
    expect(parseSesMessage(JSON.stringify({ eventType: "Send", mail: MAIL, send: {} }))).toEqual({
      kind: "events",
      events: [
        {
          provider: "ses",
          providerEventType: "Send",
          emailId: "email_01k7c8m4q2f3e9v6t5r1n0p8yz",
          providerMessageId: "0102019a-ses-message",
          type: "email.sent",
          recipients: null,
          occurredAt: new Date("2026-10-10T12:00:00.000Z"),
          sourceId: "send",
          data: {},
        },
      ],
    });
  });

  test("Delivery, bounces, complaints and delays carry their details", () => {
    const delivery = parseSesMessage(
      JSON.stringify({
        eventType: "Delivery",
        mail: MAIL,
        delivery: {
          timestamp: "2026-10-10T12:00:02.000Z",
          recipients: ["a@example.com", "b@example.com"],
          smtpResponse: "250 2.6.0 Message received",
        },
      }),
    );
    expect(delivery).toMatchObject({
      events: [
        {
          type: "email.delivered",
          recipients: ["a@example.com", "b@example.com"],
          data: { delivery: { smtp_response: "250 2.6.0 Message received" } },
        },
      ],
    });

    const bounce = parseSesMessage(
      JSON.stringify({
        eventType: "Bounce",
        mail: MAIL,
        bounce: {
          bounceType: "Permanent",
          bounceSubType: "OnTenantSuppressionList",
          bouncedRecipients: [
            { emailAddress: "a@example.com", diagnosticCode: "smtp; 550 5.1.1" },
            { emailAddress: "b@example.com" },
          ],
          timestamp: "2026-10-10T12:00:03.000Z",
          feedbackId: "feedback-1",
        },
      }),
    );
    expect(bounce).toMatchObject({
      events: [
        {
          type: "email.bounced",
          recipients: ["a@example.com"],
          suppressed: true,
          sourceId: "feedback-1",
          data: {
            bounce: {
              type: "permanent",
              sub_type: "OnTenantSuppressionList",
              diagnostic_code: "smtp; 550 5.1.1",
            },
          },
        },
        { recipients: ["b@example.com"], data: { bounce: { diagnostic_code: null } } },
      ],
    });

    const complaint = parseSesMessage(
      JSON.stringify({
        eventType: "Complaint",
        mail: MAIL,
        complaint: {
          complainedRecipients: [{ emailAddress: "a@example.com" }],
          timestamp: "2026-10-10T13:00:00.000Z",
          feedbackId: "feedback-2",
          complaintFeedbackType: "abuse",
        },
      }),
    );
    expect(complaint).toMatchObject({
      events: [
        {
          type: "email.complained",
          data: { complaint: { feedback_type: "abuse", sub_type: null } },
        },
      ],
    });

    const delay = parseSesMessage(
      JSON.stringify({
        eventType: "DeliveryDelay",
        mail: MAIL,
        deliveryDelay: {
          timestamp: "2026-10-10T12:30:00.000Z",
          delayType: "MailboxFull",
          expirationTime: "2026-10-11T12:00:00.000Z",
          delayedRecipients: [{ emailAddress: "b@example.com", diagnosticCode: "452 full" }],
        },
      }),
    );
    expect(delay).toMatchObject({
      events: [
        {
          type: "email.delivery_delayed",
          recipients: ["b@example.com"],
          data: {
            delay: {
              type: "MailboxFull",
              expires_at: "2026-10-11T12:00:00.000Z",
              diagnostic_code: "452 full",
            },
          },
        },
      ],
    });
  });

  test("rejects and rendering failures fail the email", () => {
    expect(
      parseSesMessage(
        JSON.stringify({ eventType: "Reject", mail: MAIL, reject: { reason: "Bad content" } }),
      ),
    ).toMatchObject({
      events: [{ type: "email.failed", recipients: null, data: { failure: { code: "rejected" } } }],
    });
  });

  test("unwraps SNS envelopes and EventBridge events", () => {
    const record = { eventType: "Send", mail: MAIL, send: {} };
    expect(
      parseSesMessage(JSON.stringify({ Type: "Notification", Message: JSON.stringify(record) })),
    ).toMatchObject({ kind: "events", events: [{ type: "email.sent" }] });
    expect(
      parseSesMessage(
        JSON.stringify({ source: "aws.ses", "detail-type": "Email Sent", detail: record }),
      ),
    ).toMatchObject({ kind: "events", events: [{ type: "email.sent" }] });

    expect(
      parseSesMessage(
        JSON.stringify({
          "detail-type": "Sending Status Disabled",
          source: "aws.ses",
          time: "2026-10-10T14:00:00Z",
          resources: ["arn:aws:ses:eu-west-1:123456789012:tenant/test-org_a/t-1"],
          detail: {
            version: "1.0.0",
            data: {
              origin: "AWS_MANAGED",
              record: { status: "DISABLED", cause: "High bounce rate." },
            },
          },
        }),
      ),
    ).toEqual({
      kind: "tenant_status",
      status: {
        tenantName: "test-org_a",
        status: "disabled",
        cause: "High bounce rate.",
        occurredAt: new Date("2026-10-10T14:00:00Z"),
      },
    });
  });

  test("ignores what coss.com doesn't track and throws on malformed JSON", () => {
    expect(parseSesMessage(JSON.stringify({ eventType: "Open", mail: MAIL, open: {} }))).toEqual({
      kind: "ignored",
      reason: "unhandled SES event type Open",
    });
    expect(parseSesMessage(JSON.stringify({ Type: "SubscriptionConfirmation" })).kind).toBe(
      "ignored",
    );
    expect(
      parseSesMessage("Successfully validated SNS topic for Amazon SES event publishing."),
    ).toEqual({ kind: "ignored", reason: "not JSON" });
    expect(() => parseSesMessage("{nope")).toThrow();
  });
});

describe("SES end to end (fake SES)", () => {
  test("domain, live send, delivery events and tenant pausing", async () => {
    const tenant = await createTestTenant();
    const organizationId = tenant.organization.id;
    const api = new FakeSesApi();
    const runtime = createEmailRuntime({
      provider: "ses",
      ses: { ...config, tenantPrefix: `t${uniqueSuffix()}`.slice(0, 32) },
      sesApi: api,
      dns: null,
      log: false,
    });
    const name = `t-${uniqueSuffix()}.coss.test`;

    const domain = await createDomain({ organizationId, name, userId: null }, runtime.domainDeps);
    expect(domain).toMatchObject({ provider: "ses", status: "pending", region: "eu-west-1" });
    await expect(
      authorizeLiveSender({ organizationId, from: `hello@${name}`, provider: "ses" }),
    ).rejects.toBeInstanceOf(EmailError);
    api.verify(name);
    expect(await checkDomain({ organizationId, id: domain.id }, runtime.domainDeps)).toMatchObject({
      status: "verified",
      canSend: true,
    });

    const service = dispatchingEmailService(runtime);
    const { email } = await service.send({
      environment: sendEnvironment(tenant.production),
      apiKeyId: null,
      params: params({ from: `Acme <hello@${name}>`, to: ["a@example.com", "b@example.com"] }),
    });
    expect(email).toMatchObject({ status: "sent", sandbox: false });
    expect(email.recipients.map((r) => r.status)).toEqual(["queued", "queued"]);
    const sent = api.sent.at(-1);
    expect(sent?.EmailTags).toEqual([{ Name: "coss_email_id", Value: email.id }]);

    const mail = { ...MAIL, messageId: "ses-1", tags: { coss_email_id: [email.id] } };
    const records = [
      { eventType: "Send", mail, send: {} },
      {
        eventType: "Delivery",
        mail,
        delivery: { timestamp: new Date().toISOString(), recipients: ["a@example.com"] },
      },
      {
        eventType: "Bounce",
        mail,
        bounce: {
          bounceType: "Permanent",
          bounceSubType: "General",
          bouncedRecipients: [{ emailAddress: "b@example.com" }],
          timestamp: new Date().toISOString(),
          feedbackId: "f-1",
        },
      },
    ];
    for (const record of records) {
      const parsed = parseSesMessage(JSON.stringify(record));
      if (parsed.kind !== "events") throw new Error("expected events");
      await ingestProviderEvents(parsed.events);
    }
    const after = await getEmail({
      organizationId,
      environmentId: tenant.production.id,
      id: email.id,
    });
    expect(after?.recipients.map((r) => [r.address, r.status])).toEqual([
      ["a@example.com", "delivered"],
      ["b@example.com", "bounced"],
    ]);

    // SES pauses the tenant; coss.com refuses live sends until it is re-enabled.
    const [emailTenant] = await db
      .select()
      .from(schema.emailTenant)
      .where(eq(schema.emailTenant.organizationId, organizationId));
    if (!emailTenant) throw new Error("no tenant");
    expect(sent?.TenantName).toBe(emailTenant.tenantName);
    const prefix = emailTenant.tenantName.slice(0, emailTenant.tenantName.indexOf("-"));
    const at = new Date();
    expect(
      await applyTenantStatus(
        {
          tenantName: emailTenant.tenantName,
          status: "disabled",
          cause: "Bounces",
          occurredAt: at,
        },
        prefix,
      ),
    ).toBe(true);
    // Older or foreign reports are ignored.
    expect(
      await applyTenantStatus(
        {
          tenantName: emailTenant.tenantName,
          status: "enabled",
          cause: null,
          occurredAt: new Date(at.getTime() - 1000),
        },
        prefix,
      ),
    ).toBe(false);
    expect(
      await applyTenantStatus(
        {
          tenantName: emailTenant.tenantName,
          status: "enabled",
          cause: null,
          occurredAt: new Date(),
        },
        "other",
      ),
    ).toBe(false);
    await expect(
      authorizeLiveSender({ organizationId, from: `hello@${name}`, provider: "ses" }),
    ).rejects.toMatchObject({ code: "sending_paused" });

    await deleteDomain({ organizationId, id: domain.id }, runtime.domainDeps);
    expect(api.identities.has(name)).toBe(false);
  });
});
