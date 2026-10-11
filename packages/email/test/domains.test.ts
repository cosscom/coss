import { describe, expect, test } from "bun:test";
import { db, schema } from "@coss/db";
import { uniqueSuffix } from "@coss/db/testing";
import { createTestTenant } from "@coss/tenancy/testing";
import { eq } from "drizzle-orm";
import { checkRecords, expectedRecords } from "../src/dns.ts";
import {
  authorizeLiveSender,
  checkDomain,
  createDomain,
  type DomainDeps,
  deleteDomain,
  ensureOrgTenant,
  MAX_PENDING_DOMAINS,
  normalizeDomainName,
  recheckDueDomains,
  restartDomainVerification,
  toDomainObject,
  VERIFICATION_WINDOW_MS,
} from "../src/domains.ts";
import { DomainError, EmailError } from "../src/errors.ts";
import { type IdentityProvider, IdentityTakenError } from "../src/provider.ts";
import { FakeEmailProvider } from "../src/providers/fake.ts";
import { FakeIdentityProvider } from "../src/providers/fake-identity.ts";
import { FakeTrackingHostnameProvider } from "../src/providers/fake-tracking-hostnames.ts";
import { createVerifiedDomain, dispatchingEmailService, fakeDnsResolver } from "../src/testing.ts";
import { params, sendEnvironment } from "./helpers.ts";

const uniqueName = () => `t-${uniqueSuffix()}.coss.test`;

function deps(identity: IdentityProvider = new FakeIdentityProvider()): DomainDeps {
  return { identity, dns: null, tracking: new FakeTrackingHostnameProvider() };
}

async function expectError<T extends Error>(
  promise: Promise<unknown>,
  type: new (...args: never[]) => T,
  code: string,
): Promise<T> {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(type);
  expect((error as { code: string }).code).toBe(code);
  return error as T;
}

describe("normalizeDomainName", () => {
  test("lower-cases and strips a trailing dot", () => {
    expect(normalizeDomainName("  Mail.Acme.COM. ")).toBe("mail.acme.com");
    expect(normalizeDomainName("xn--bcher-kva.example")).toBe("xn--bcher-kva.example");
  });

  test.each([
    "",
    "acme",
    "https://acme.com",
    "acme.com/path",
    "-acme.com",
    "bücher.example",
    "10.0.0.1",
    "amazonses.com",
    "x.amazonses.com",
    "send.acme.com",
    `${"a".repeat(64)}.com`,
  ])("rejects %p", (name) => {
    expect(() => normalizeDomainName(name)).toThrow(DomainError);
  });
});

describe("createDomain", () => {
  test("claims the name, creates the tenant and identity, and lists the records to publish", async () => {
    const tenant = await createTestTenant();
    const name = uniqueName();

    const row = await createDomain(
      { organizationId: tenant.organization.id, name: name.toUpperCase(), userId: tenant.owner.id },
      deps(),
    );

    expect(row).toMatchObject({
      name,
      status: "pending",
      canSend: false,
      provider: "fake",
      mailFromDomain: `send.${name}`,
      region: "us-east-1",
    });
    expect(row.dkimTokens).toHaveLength(3);
    expect(row.nextCheckAt).not.toBeNull();
    const [emailTenant] = await db
      .select()
      .from(schema.emailTenant)
      .where(eq(schema.emailTenant.organizationId, tenant.organization.id));
    expect(emailTenant).toMatchObject({
      provider: "fake",
      tenantName: `fake-${tenant.organization.id}`,
      sendingStatus: "enabled",
    });

    const records = expectedRecords(row);
    expect(records.map((r) => [r.purpose, r.type, r.name, r.required])).toEqual([
      ["dkim", "CNAME", `${row.dkimTokens[0]}._domainkey.${name}`, true],
      ["dkim", "CNAME", `${row.dkimTokens[1]}._domainkey.${name}`, true],
      ["dkim", "CNAME", `${row.dkimTokens[2]}._domainkey.${name}`, true],
      ["mail_from_mx", "MX", `send.${name}`, true],
      ["mail_from_spf", "TXT", `send.${name}`, true],
      ["dmarc", "TXT", `_dmarc.${name}`, false],
    ]);
    expect(records[3]).toMatchObject({
      value: "feedback-smtp.us-east-1.amazonses.com",
      priority: 10,
    });
  });

  test("a name is held by one organization until its verification fails", async () => {
    const first = await createTestTenant();
    const second = await createTestTenant();
    const name = uniqueName();
    const row = await createDomain(
      { organizationId: first.organization.id, name, userId: null },
      deps(),
    );

    const again = await expectError(
      createDomain({ organizationId: first.organization.id, name, userId: null }, deps()),
      DomainError,
      "domain_taken",
    );
    expect(again.message).toContain("already been added");
    const taken = await expectError(
      createDomain({ organizationId: second.organization.id, name, userId: null }, deps()),
      DomainError,
      "domain_taken",
    );
    expect(taken.message).toContain("another account");

    // Never verifies; past the window it fails and releases the name.
    const identity = new FakeIdentityProvider({ verify: () => false });
    const failed = await checkDomain(
      {
        organizationId: first.organization.id,
        id: row.id,
        now: new Date(Date.now() + VERIFICATION_WINDOW_MS + 60_000),
      },
      deps(identity),
    );
    expect(failed).toMatchObject({ status: "failed", nextCheckAt: null });
    expect(failed.failedAt).not.toBeNull();

    const claimed = await createDomain(
      { organizationId: second.organization.id, name, userId: null },
      deps(),
    );
    expect(claimed.organizationId).toBe(second.organization.id);
    await expectError(
      restartDomainVerification({ organizationId: first.organization.id, id: row.id }, deps()),
      DomainError,
      "domain_taken",
    );
  });

  test("limits domains awaiting verification", async () => {
    const tenant = await createTestTenant();
    const organizationId = tenant.organization.id;
    for (let i = 0; i < MAX_PENDING_DOMAINS; i++) {
      await createDomain({ organizationId, name: uniqueName(), userId: null }, deps());
    }
    await expectError(
      createDomain({ organizationId, name: uniqueName(), userId: null }, deps()),
      DomainError,
      "too_many_pending_domains",
    );
  });

  test("releases the claim when the provider refuses", async () => {
    const tenant = await createTestTenant();
    const organizationId = tenant.organization.id;
    const name = uniqueName();
    const refusing = (error: Error): IdentityProvider => {
      const fake = new FakeIdentityProvider();
      return {
        name: fake.name,
        ensureTenant: (input) => fake.ensureTenant(input),
        createDomainIdentity: async () => {
          throw error;
        },
        getDomainIdentity: (domain) => fake.getDomainIdentity(domain),
        deleteDomainIdentity: (input) => fake.deleteDomainIdentity(input),
      };
    };

    await expectError(
      createDomain({ organizationId, name, userId: null }, deps(refusing(new Error("boom")))),
      DomainError,
      "provider_error",
    );
    await expectError(
      createDomain(
        { organizationId, name, userId: null },
        deps(refusing(new IdentityTakenError(name))),
      ),
      DomainError,
      "domain_taken",
    );
    const row = await createDomain({ organizationId, name, userId: null }, deps());
    expect(row.status).toBe("pending");
  });
});

describe("toDomainObject", () => {
  test("is the wire shape, with the records to publish and no provider internals", async () => {
    const tenant = await createTestTenant();
    const name = uniqueName();
    const created = await createDomain(
      { organizationId: tenant.organization.id, name, userId: tenant.owner.id },
      deps(new FakeIdentityProvider({ verify: () => false })),
    );

    const object = toDomainObject(created);

    expect(object).toMatchObject({
      object: "domain",
      id: created.id,
      name,
      status: "pending",
      can_send: false,
      mail_from_domain: `send.${name}`,
      mail_from_status: "pending",
      created_at: created.createdAt.toISOString(),
      last_checked_at: null,
      verified_at: null,
      failed_at: null,
    });
    // A never-checked domain still shows what to publish.
    expect(created.records).toEqual([]);
    expect(object.records).toEqual(expectedRecords(created));
    // Tenancy and provider bookkeeping stay internal.
    expect(Object.keys(object)).not.toContain("organization_id");
    expect(JSON.stringify(object)).not.toContain(tenant.organization.id);
  });

  test("reports the latest check once there has been one", async () => {
    const tenant = await createTestTenant();
    const existing = await createVerifiedDomain(tenant.organization.id);
    const checked = await checkDomain(
      { organizationId: tenant.organization.id, id: existing.id },
      deps(),
    );

    const object = toDomainObject(checked);

    expect(object).toMatchObject({ status: "verified", can_send: true });
    expect(object.last_checked_at).toBe(checked.lastCheckedAt?.toISOString() ?? null);
    expect(object.records).toEqual(checked.records);
  });
});

describe("checkDomain", () => {
  test("stores the provider's verdict and schedules the next check", async () => {
    const tenant = await createTestTenant();
    const organizationId = tenant.organization.id;
    const row = await createDomain({ organizationId, name: uniqueName(), userId: null }, deps());
    const now = new Date();

    const checked = await checkDomain({ organizationId, id: row.id, now }, deps());

    expect(checked).toMatchObject({
      status: "verified",
      canSend: true,
      mailFromStatus: "success",
      lastCheckedAt: now,
      verifiedAt: now,
      nextCheckAt: new Date(now.getTime() + 12 * 60 * 60 * 1000),
    });
    expect(checked.dkimTokens).toEqual(row.dkimTokens);
    // No resolver with the fake provider: records are listed but not checked.
    expect(checked.records.every((r) => r.status === "not_checked")).toBe(true);
  });

  test("a verified domain that temporarily fails is not given up", async () => {
    const tenant = await createTestTenant();
    const organizationId = tenant.organization.id;
    const row = await createDomain({ organizationId, name: uniqueName(), userId: null }, deps());
    await checkDomain({ organizationId, id: row.id }, deps());
    const flaky: IdentityProvider = {
      name: "fake",
      ensureTenant: async () => ({ tenantName: "x", tenantArn: null }),
      createDomainIdentity: async () => {
        throw new Error("unused");
      },
      getDomainIdentity: async () => ({
        dkimTokens: row.dkimTokens,
        dkimHostedZone: "dkim.amazonses.com",
        region: "us-east-1",
        status: "temporary_failure",
        canSend: false,
        mailFromStatus: "success",
      }),
      deleteDomainIdentity: async () => {
        throw new Error("must not release a verified domain");
      },
    };

    const later = new Date(Date.now() + 2 * VERIFICATION_WINDOW_MS);
    const checked = await checkDomain({ organizationId, id: row.id, now: later }, deps(flaky));
    expect(checked).toMatchObject({ status: "temporary_failure", canSend: false });
    expect(checked.verifiedAt).not.toBeNull();
  });

  test("recheckDueDomains checks due domains once", async () => {
    const tenant = await createTestTenant();
    const organizationId = tenant.organization.id;
    const row = await createDomain({ organizationId, name: uniqueName(), userId: null }, deps());
    const scope = { organizationIds: [organizationId] };
    const later = new Date(Date.now() + 2 * 60 * 1000);

    const [first, second] = await Promise.all([
      recheckDueDomains({ now: later, scope }, deps()),
      recheckDueDomains({ now: later, scope }, deps()),
    ]);
    expect((first ?? 0) + (second ?? 0)).toBe(1);
    expect(await recheckDueDomains({ now: later, scope }, deps())).toBe(0);
    const [stored] = await db.select().from(schema.domain).where(eq(schema.domain.id, row.id));
    expect(stored?.status).toBe("verified");
  });

  test("recheckDueDomains leases nothing once shutdown has begun", async () => {
    const tenant = await createTestTenant();
    const organizationId = tenant.organization.id;
    const row = await createDomain({ organizationId, name: uniqueName(), userId: null }, deps());
    const scope = { organizationIds: [organizationId] };
    const later = new Date(Date.now() + 2 * 60 * 1000);
    const [before] = await db.select().from(schema.domain).where(eq(schema.domain.id, row.id));

    expect(
      await recheckDueDomains({ now: later, scope, signal: AbortSignal.abort() }, deps()),
    ).toBe(0);
    const [after] = await db.select().from(schema.domain).where(eq(schema.domain.id, row.id));
    expect(after?.nextCheckAt).toEqual(before?.nextCheckAt ?? null);
    // Still due for the next worker.
    expect(await recheckDueDomains({ now: later, scope }, deps())).toBe(1);
  });
});

describe("checkRecords", () => {
  test("reports verified, missing and mismatched records", async () => {
    const records = expectedRecords({
      name: "acme.test",
      dkimTokens: ["aaa"],
      dkimHostedZone: "dkim.amazonses.com",
      mailFromDomain: "send.acme.test",
      region: "eu-west-1",
    });
    const dns = fakeDnsResolver({
      "CNAME aaa._domainkey.acme.test": ["AAA.dkim.amazonses.com."],
      "MX send.acme.test": [
        { exchange: "feedback-smtp.eu-west-1.amazonses.com", priority: 10 },
        { exchange: "mx.other.test", priority: 20 },
      ],
      "TXT send.acme.test": [["v=spf1 include:amazonses.com", " ~all"]],
    });

    const checked = await checkRecords(records, dns);

    expect(checked.map((r) => [r.purpose, r.status])).toEqual([
      ["dkim", "verified"],
      // Exactly one MX is required.
      ["mail_from_mx", "mismatch"],
      ["mail_from_spf", "verified"],
      ["dmarc", "missing"],
    ]);
    expect(checked[1]?.found).toEqual([
      "10 feedback-smtp.eu-west-1.amazonses.com",
      "20 mx.other.test",
    ]);
  });

  test("lookup errors leave records unchecked", async () => {
    const records = expectedRecords({
      name: "acme.test",
      dkimTokens: [],
      dkimHostedZone: null,
      mailFromDomain: "send.acme.test",
      region: null,
    });
    const failing = {
      resolveCname: async () => {
        throw Object.assign(new Error("timeout"), { code: "ETIMEOUT" });
      },
      resolveMx: async () => {
        throw Object.assign(new Error("timeout"), { code: "ETIMEOUT" });
      },
      resolveTxt: async () => {
        throw Object.assign(new Error("timeout"), { code: "ESERVFAIL" });
      },
    };
    const checked = await checkRecords(records, failing);
    expect(checked.every((r) => r.status === "not_checked")).toBe(true);
  });
});

describe("authorizeLiveSender", () => {
  test("requires a verified domain of the organization, most specific match first", async () => {
    const tenant = await createTestTenant();
    const other = await createTestTenant();
    const organizationId = tenant.organization.id;
    const verified = await createVerifiedDomain(organizationId);
    const allowed = (from: string, provider = "fake") =>
      authorizeLiveSender({ organizationId, from, provider });

    await allowed(`Acme <hello@${verified.name}>`);
    await allowed(`hello@News.${verified.name}`);
    // Verified by another provider (e.g. the fake one before switching to SES).
    await expectError(allowed(`hello@${verified.name}`, "ses"), EmailError, "domain_not_verified");
    await expectError(allowed("hello@unknown.coss.test"), EmailError, "domain_not_verified");
    // Reserved for bounces.
    await expectError(allowed(`hello@send.${verified.name}`), EmailError, "domain_not_verified");
    // Another organization's more specific domain wins.
    await createVerifiedDomain(other.organization.id, { name: `mail.${verified.name}` });
    await expectError(allowed(`hello@mail.${verified.name}`), EmailError, "domain_not_verified");
    // Pending domains don't count.
    const pending = await createDomain(
      { organizationId, name: uniqueName(), userId: null },
      deps(),
    );
    await expectError(allowed(`hello@${pending.name}`), EmailError, "domain_not_verified");
  });

  test("a paused tenant can't send", async () => {
    const tenant = await createTestTenant();
    const organizationId = tenant.organization.id;
    const verified = await createVerifiedDomain(organizationId);
    await ensureOrgTenant(organizationId, new FakeIdentityProvider());
    await db
      .update(schema.emailTenant)
      .set({ sendingStatus: "disabled" })
      .where(eq(schema.emailTenant.organizationId, organizationId));

    await expectError(
      authorizeLiveSender({ organizationId, from: `hello@${verified.name}`, provider: "fake" }),
      EmailError,
      "sending_paused",
    );
  });
});

describe("live sends", () => {
  test("are refused from unverified domains, but idempotent retries still replay", async () => {
    const tenant = await createTestTenant();
    const organizationId = tenant.organization.id;
    const provider = new FakeEmailProvider({ log: false });
    const service = dispatchingEmailService({ liveProvider: provider, sandboxProvider: provider });
    const environment = sendEnvironment(tenant.production);

    await expectError(
      service.send({ environment, apiKeyId: null, params: params() }),
      EmailError,
      "domain_not_verified",
    );

    const verified = await createVerifiedDomain(organizationId);
    const request = params({ from: `hello@${verified.name}` });
    const idempotencyKey = `key-${uniqueSuffix()}`;
    const first = await service.send({
      environment,
      apiKeyId: null,
      params: request,
      idempotencyKey,
    });
    await deleteDomain({ organizationId, id: verified.id }, deps());

    const retry = await service.send({
      environment,
      apiKeyId: null,
      params: request,
      idempotencyKey,
    });
    expect(retry).toEqual({ email: first.email, replayed: true });
    await expectError(
      service.send({ environment, apiKeyId: null, params: request }),
      EmailError,
      "domain_not_verified",
    );
    expect(provider.sent).toHaveLength(1);
  });
});

describe("provider switches", () => {
  test("domains of another provider are neither checked nor leased", async () => {
    const tenant = await createTestTenant();
    const organizationId = tenant.organization.id;
    const row = await createDomain({ organizationId, name: uniqueName(), userId: null }, deps());
    const ses = { ...new FakeIdentityProvider(), name: "ses" } as unknown as IdentityProvider;
    const sesDeps: DomainDeps = { ...deps(), identity: ses };

    expect(await checkDomain({ organizationId, id: row.id }, sesDeps)).toEqual(row);
    const later = new Date(Date.now() + 2 * 60 * 1000);
    expect(
      await recheckDueDomains(
        { now: later, scope: { organizationIds: [organizationId] } },
        sesDeps,
      ),
    ).toBe(0);
  });
});
