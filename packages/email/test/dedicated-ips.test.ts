import { describe, expect, test } from "bun:test";
import { db, schema } from "@coss/db";
import { createTestTenant } from "@coss/tenancy/testing";
import { and, eq, sum } from "drizzle-orm";
import {
  dedicatedIpPoolObject,
  dedicatedIpSlotAvailable,
  getDedicatedIpPool,
  READY_MIN_DELIVERIES,
  RELEASE_DELAY_MS,
  reconcileDedicatedIpPools,
  releaseOrganizationDedicatedIps,
} from "../src/dedicated-ips.ts";
import { ensureOrgTenant, releaseOrganizationEmailResources } from "../src/domains.ts";
import { DedicatedIpTakenError, type OutboundEmail } from "../src/provider.ts";
import { FakeEmailProvider } from "../src/providers/fake.ts";
import { FakeDedicatedIpProvider } from "../src/providers/fake-dedicated-ips.ts";
import { FakeIdentityProvider } from "../src/providers/fake-identity.ts";
import { FakeTrackingHostnameProvider } from "../src/providers/fake-tracking-hostnames.ts";
import { purgeExpiredDedicatedIpRollups } from "../src/retention.ts";
import { SesDedicatedIpProvider } from "../src/ses/dedicated-ips.ts";
import { SesIdentityProvider } from "../src/ses/identity.ts";
import { parseSesEvent } from "../src/ses/parse.ts";
import { SesEmailProvider } from "../src/ses/provider.ts";
import { dispatchingEmailService, FakeSesApi } from "../src/testing.ts";
import { params, sendEnvironment, verifiedFrom } from "./helpers.ts";

const config = { region: "eu-west-1", configurationSet: "coss-test", tenantPrefix: "test" };
const ORG = "org_01k7c8m4q2f3e9v6t5r1n0p8yz";
const MINUTE = 60 * 1000;

function sesFixture() {
  const api = new FakeSesApi();
  api.bootstrap(config.configurationSet);
  return {
    api,
    identity: new SesIdentityProvider(api, config),
    pools: new SesDedicatedIpProvider(api, config),
  };
}

describe("SesDedicatedIpProvider", () => {
  test("creates a managed pool and a configuration set sending through it, idempotently", async () => {
    const { api, identity, pools } = sesFixture();
    const tenant = await identity.ensureTenant({ organizationId: ORG });
    await pools.ensurePool({ organizationId: ORG, tenant });
    const name = `test-${ORG}`;
    expect(api.pools.get(name)?.scalingMode).toBe("MANAGED");
    const set = api.configurationSets.get(name);
    expect(set?.poolName).toBe(name);
    // The shared set's event destination, so its events reach the worker too.
    expect([...(set?.destinations.keys() ?? [])]).toEqual(["coss-events"]);
    expect(api.associations.get(api.configurationSetArn(name))).toEqual(new Set([name]));

    await pools.ensurePool({ organizationId: ORG, tenant });
    expect(api.pools.size).toBe(1);

    api.pools.get(name)?.ips.push("203.0.113.7", "203.0.113.5");
    expect(await pools.poolIps(ORG)).toEqual(["203.0.113.5", "203.0.113.7"]);
    expect(await pools.poolIps("org_01k7c8m4q2f3e9v6t5r1n0p8zz")).toEqual([]);
  });

  test("never adopts a pool COSS didn't create", async () => {
    const { api, identity, pools } = sesFixture();
    const tenant = await identity.ensureTenant({ organizationId: ORG });
    await api.createDedicatedIpPool({ PoolName: `test-${ORG}`, ScalingMode: "STANDARD" });
    await expect(pools.ensurePool({ organizationId: ORG, tenant })).rejects.toBeInstanceOf(
      DedicatedIpTakenError,
    );
  });

  test("releases the association, then the configuration set, then the pool", async () => {
    const { api, identity, pools } = sesFixture();
    const tenant = await identity.ensureTenant({ organizationId: ORG });
    await pools.ensurePool({ organizationId: ORG, tenant });
    const before = api.calls.length;
    await pools.releasePool({ organizationId: ORG, tenant });
    expect(
      api.calls
        .slice(before)
        .map((call) => call.operation)
        .filter((operation) => operation.startsWith("delete")),
    ).toEqual([
      "deleteTenantResourceAssociation",
      "deleteConfigurationSet",
      "deleteDedicatedIpPool",
    ]);
    expect(api.pools.size).toBe(0);
    expect(api.configurationSets.has(`test-${ORG}`)).toBe(false);
    // Again: nothing left, nothing fails.
    await pools.releasePool({ organizationId: ORG, tenant });
    await pools.releasePool({ organizationId: ORG, tenant: null });
  });

  test("dedicated sends use the organization's configuration set", async () => {
    const api = new FakeSesApi();
    const provider = new SesEmailProvider(api, config);
    const message: OutboundEmail = {
      emailId: "email_01k7c8m4q2f3e9v6t5r1n0p8yz",
      organizationId: ORG,
      from: "hello@acme.com",
      to: ["a@example.com"],
      cc: [],
      bcc: [],
      replyTo: [],
      subject: "Hi",
      html: null,
      text: "Hi",
      headers: {},
      tags: [],
      attachments: [],
    };
    await provider.send(message);
    await provider.send({ ...message, dedicatedPool: true });
    expect(api.sent.map((input) => input.ConfigurationSetName)).toEqual([
      "coss-test",
      `test-${ORG}`,
    ]);
    expect(api.sent.map((input) => input.TenantName)).toEqual([`test-${ORG}`, `test-${ORG}`]);
  });

  test("delivery events carry the IP they left from", () => {
    const parsed = parseSesEvent({
      eventType: "Delivery",
      mail: {
        timestamp: "2026-10-12T10:00:00.000Z",
        messageId: "ses-1",
        tags: {
          coss_email_id: ["email_01k7c8m4q2f3e9v6t5r1n0p8yz"],
          "ses:outgoing-ip": ["203.0.113.7"],
        },
      },
      delivery: { timestamp: "2026-10-12T10:00:01.000Z", recipients: ["a@example.com"] },
    });
    expect(parsed.kind === "events" && parsed.events[0]?.sendingIp).toBe("203.0.113.7");
  });
});

const identity = new FakeIdentityProvider();

function deps(dedicatedIps = new FakeDedicatedIpProvider()) {
  return { identity, dedicatedIps };
}

/** A tenant whose organization has its provider tenant (created with its first domain). */
async function tenantWithProviderTenant() {
  const tenant = await createTestTenant();
  await ensureOrgTenant(tenant.organization.id, identity);
  return tenant;
}

describe("reconcileDedicatedIpPools", () => {
  test("waits for the organization's first domain", async () => {
    const tenant = await createTestTenant();
    const org = tenant.organization.id;
    await reconcileDedicatedIpPools({ entitled: [org], scope: { organizationIds: [org] } }, deps());
    expect(await getDedicatedIpPool(org)).toMatchObject({
      status: "provisioning",
      statusMessage: "Add a sending domain to start using your dedicated IPs.",
    });
  });

  test("provisions, warms up, gets ready, then releases a day after the entitlement ends", async () => {
    const tenant = await tenantWithProviderTenant();
    const org = tenant.organization.id;
    const scope = { organizationIds: [org] };
    const pools = new FakeDedicatedIpProvider();
    const now = new Date();

    expect(await reconcileDedicatedIpPools({ entitled: [org], now, scope }, deps(pools))).toBe(1);
    let row = await getDedicatedIpPool(org);
    expect(row?.status).toBe("warming");
    expect(pools.pools).toEqual([org]);
    // Its first refresh is due right away: the pool's IPs.
    await reconcileDedicatedIpPools({ entitled: [org], now, scope }, deps(pools));
    row = await getDedicatedIpPool(org);
    expect(row?.ips).toEqual(["198.51.100.10"]);
    expect(row?.dedicatedShare).toBeNull();

    await db.insert(schema.dedicatedIpDeliveryRollup).values([
      {
        organizationId: org,
        hour: new Date(now.getTime() - 60 * MINUTE),
        sendingIp: "198.51.100.10",
        delivered: READY_MIN_DELIVERIES,
      },
      {
        organizationId: org,
        hour: new Date(now.getTime() - 60 * MINUTE),
        sendingIp: "192.0.2.1",
        delivered: 10,
      },
    ]);
    const later = new Date(now.getTime() + 61 * MINUTE);
    await reconcileDedicatedIpPools({ entitled: [org], now: later, scope }, deps(pools));
    row = await getDedicatedIpPool(org);
    expect(row?.status).toBe("ready");
    expect(row?.dedicatedShare).toBeCloseTo(1000 / 1010, 5);
    expect(await dedicatedIpPoolObject(org, later)).toMatchObject({
      status: "ready",
      ips: [{ ip: "198.51.100.10", delivered_7d: 1000 }],
    });

    // The add-on ends: sends stop using the pool at once; it goes a day later.
    await reconcileDedicatedIpPools({ entitled: [], now: later, scope }, deps(pools));
    row = await getDedicatedIpPool(org);
    expect(row?.status).toBe("releasing");
    expect(pools.pools).toEqual([org]);
    const dayLater = new Date(later.getTime() + RELEASE_DELAY_MS);
    await reconcileDedicatedIpPools({ entitled: [], now: dayLater, scope }, deps(pools));
    expect(await getDedicatedIpPool(org)).toBeNull();
    expect(pools.pools).toEqual([]);
    const audit = await db
      .select({ action: schema.orgAuditEvent.action })
      .from(schema.orgAuditEvent)
      .where(eq(schema.orgAuditEvent.organizationId, org));
    expect(audit.map((event) => event.action).sort()).toEqual([
      "dedicated_ips.provisioned",
      "dedicated_ips.released",
    ]);
  });

  test("an entitlement back before the release keeps the pool", async () => {
    const tenant = await tenantWithProviderTenant();
    const org = tenant.organization.id;
    const scope = { organizationIds: [org] };
    const now = new Date();
    const pools = new FakeDedicatedIpProvider();
    await reconcileDedicatedIpPools({ entitled: [org], now, scope }, deps(pools));
    await reconcileDedicatedIpPools({ entitled: [], now, scope }, deps(pools));
    expect((await getDedicatedIpPool(org))?.status).toBe("releasing");
    await reconcileDedicatedIpPools({ entitled: [org], now, scope }, deps(pools));
    expect((await getDedicatedIpPool(org))?.status).toBe("warming");
    expect(pools.pools).toEqual([org]);
  });

  test("an entitlement back after the release started waits for it, then gets a new pool", async () => {
    const tenant = await tenantWithProviderTenant();
    const org = tenant.organization.id;
    const scope = { organizationIds: [org] };
    const now = new Date();
    let failing = false;
    const pools = new FakeDedicatedIpProvider({
      fail: (operation) => failing && operation === "release",
    });
    await reconcileDedicatedIpPools({ entitled: [org], now, scope }, deps(pools));
    await reconcileDedicatedIpPools({ entitled: [], now, scope }, deps(pools));
    // The release starts (and fails half-way at the provider) before the entitlement is back.
    failing = true;
    const dayLater = new Date(now.getTime() + RELEASE_DELAY_MS);
    await reconcileDedicatedIpPools({ entitled: [], now: dayLater, scope }, deps(pools));
    let row = await getDedicatedIpPool(org);
    expect(row).toMatchObject({ status: "releasing", attempts: 1 });
    expect(row?.releaseStartedAt).toEqual(dayLater);

    // Restoring it now could leave a warming row whose resources are gone: it finishes first.
    failing = false;
    await reconcileDedicatedIpPools({ entitled: [org], now: dayLater, scope }, deps(pools));
    expect((await getDedicatedIpPool(org))?.status).toBe("releasing");
    const retry = new Date(dayLater.getTime() + MINUTE);
    await reconcileDedicatedIpPools({ entitled: [org], now: retry, scope }, deps(pools));
    expect(await getDedicatedIpPool(org)).toBeNull();
    expect(pools.pools).toEqual([]);
    await reconcileDedicatedIpPools({ entitled: [org], now: retry, scope }, deps(pools));
    row = await getDedicatedIpPool(org);
    expect(row?.status).toBe("warming");
    expect(row?.releaseStartedAt).toBeNull();
    expect(pools.pools).toEqual([org]);
  });

  test("a purchase fits while pools and claims leave a slot, one purchase at a time", async () => {
    const a = (await tenantWithProviderTenant()).organization.id;
    const b = (await tenantWithProviderTenant()).organization.id;
    const scope = { organizationIds: [a, b] };
    const pools = new FakeDedicatedIpProvider();
    await reconcileDedicatedIpPools({ entitled: [a], scope }, deps(pools));
    const fits = (organizationId: string, claimants: string[], capacity = 2) =>
      db.transaction((tx) =>
        dedicatedIpSlotAvailable(tx, organizationId, async () => claimants, { capacity, scope }),
      );
    // `a`'s pool and a paid (entitled, not provisioned yet) or unpaid claim fill two slots.
    expect(await fits(b, [])).toBe(true);
    expect(await fits(b, ["org_paid_not_provisioned"])).toBe(false);
    expect(await fits(b, [a, b])).toBe(true);
    expect(await fits(a, ["org_paid_not_provisioned"])).toBe(true);
    expect(await fits(b, [], 1)).toBe(false);

    // A second purchase waits for the first's transaction (and then sees what it committed).
    let release = () => {};
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    let locked = () => {};
    const firstLocked = new Promise<void>((resolve) => {
      locked = resolve;
    });
    const first = db.transaction(async (tx) => {
      await dedicatedIpSlotAvailable(tx, b, async () => [], { capacity: 2, scope });
      locked();
      await held;
    });
    // The lock is platform-wide: a failure below must not leave it held for every later test.
    try {
      await firstLocked;
      let secondDone = false;
      const second = fits(b, []).then((result) => {
        secondDone = true;
        return result;
      });
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(secondDone).toBe(false);
      release();
      await first;
      expect(await second).toBe(true);
    } finally {
      release();
      await first;
    }
  });

  test("waits past capacity, and takes the slot once one frees up", async () => {
    const a = (await tenantWithProviderTenant()).organization.id;
    const b = (await tenantWithProviderTenant()).organization.id;
    const scope = { organizationIds: [a, b] };
    const now = new Date();
    const pools = new FakeDedicatedIpProvider();
    await reconcileDedicatedIpPools({ entitled: [a, b], now, scope, capacity: 1 }, deps(pools));
    expect((await getDedicatedIpPool(a))?.status).toBe("warming");
    expect((await getDedicatedIpPool(b))?.status).toBe("waiting");
    expect(pools.pools).toEqual([a]);

    // `a` ends; once released, `b` gets its slot.
    await reconcileDedicatedIpPools({ entitled: [b], now, scope, capacity: 1 }, deps(pools));
    const released = new Date(now.getTime() + RELEASE_DELAY_MS);
    await reconcileDedicatedIpPools(
      { entitled: [b], now: released, scope, capacity: 1 },
      deps(pools),
    );
    await reconcileDedicatedIpPools(
      { entitled: [b], now: released, scope, capacity: 1 },
      deps(pools),
    );
    expect(await getDedicatedIpPool(a)).toBeNull();
    expect((await getDedicatedIpPool(b))?.status).toBe("warming");
  });

  test("a failing provider is retried with backoff", async () => {
    const tenant = await tenantWithProviderTenant();
    const org = tenant.organization.id;
    const scope = { organizationIds: [org] };
    const now = new Date();
    let failing = true;
    const pools = new FakeDedicatedIpProvider({ fail: () => failing });
    await reconcileDedicatedIpPools({ entitled: [org], now, scope }, deps(pools));
    const row = await getDedicatedIpPool(org);
    expect(row).toMatchObject({ status: "provisioning", attempts: 1 });
    expect(row?.nextCheckAt?.getTime()).toBe(now.getTime() + MINUTE);
    failing = false;
    await reconcileDedicatedIpPools(
      { entitled: [org], now: new Date(now.getTime() + MINUTE), scope },
      deps(pools),
    );
    expect((await getDedicatedIpPool(org))?.status).toBe("warming");
  });
});

describe("sending through a dedicated pool", () => {
  test("live sends go through the pool once it is warming; metered and counted per IP", async () => {
    const tenant = await tenantWithProviderTenant();
    const org = tenant.organization.id;
    const provider = new FakeEmailProvider({ log: false });
    const service = dispatchingEmailService({ liveProvider: provider, sandboxProvider: provider });
    const from = await verifiedFrom(org);
    const send = (env: typeof tenant.production) =>
      service.send({
        environment: sendEnvironment(env),
        apiKeyId: null,
        params: params({ from, to: ["a@example.com", "b@example.com"] }),
      });

    const before = await send(tenant.production);
    await reconcileDedicatedIpPools({ entitled: [org], scope: { organizationIds: [org] } }, deps());
    const live = await send(tenant.production);
    const sandbox = await send(tenant.development);
    expect(provider.sent.map((message) => message.dedicatedPool)).toEqual([false, true, false]);

    const flags = await db
      .select({ id: schema.email.id, dedicatedPool: schema.email.dedicatedPool })
      .from(schema.email)
      .where(eq(schema.email.organizationId, org));
    const flagOf = new Map(flags.map((row) => [row.id, row.dedicatedPool]));
    expect([before, live, sandbox].map((r) => flagOf.get(r.email.id))).toEqual([
      false,
      true,
      false,
    ]);

    const [metered] = await db
      .select({ total: sum(schema.billingUsage.quantity) })
      .from(schema.billingUsage)
      .where(
        and(
          eq(schema.billingUsage.organizationId, org),
          eq(schema.billingUsage.meter, "email.dedicated_ip"),
        ),
      );
    expect(Number(metered?.total)).toBe(2);

    const [counted] = await db
      .select({ total: sum(schema.dedicatedIpDeliveryRollup.delivered) })
      .from(schema.dedicatedIpDeliveryRollup)
      .where(eq(schema.dedicatedIpDeliveryRollup.organizationId, org));
    expect(Number(counted?.total)).toBe(2);
  });
});

describe("organization deletion", () => {
  const requestDeletion = (tenant: Awaited<ReturnType<typeof createTestTenant>>) =>
    db.insert(schema.organizationDeletion).values({
      organizationId: tenant.organization.id,
      organizationName: tenant.organization.name,
      organizationSlug: tenant.organization.slug,
      requestedByEmail: "owner@example.com",
      nextAttemptAt: null,
    });

  test("an organization being deleted gets no pool, even while its contract lasts", async () => {
    const tenant = await tenantWithProviderTenant();
    const org = tenant.organization.id;
    await requestDeletion(tenant);
    const pools = new FakeDedicatedIpProvider();
    await reconcileDedicatedIpPools(
      { entitled: [org], scope: { organizationIds: [org] } },
      deps(pools),
    );
    expect(await getDedicatedIpPool(org)).toBeNull();
    expect(pools.pools).toEqual([]);
  });

  test("a pool created while the teardown ran is released again", async () => {
    const tenant = await tenantWithProviderTenant();
    const org = tenant.organization.id;
    // The deletion is requested and its teardown runs while the worker is creating the pool.
    class TornDown extends FakeDedicatedIpProvider {
      override async ensurePool(input: Parameters<FakeDedicatedIpProvider["ensurePool"]>[0]) {
        await requestDeletion(tenant);
        await releaseOrganizationDedicatedIps(org, this);
        await super.ensurePool(input);
      }
    }
    const pools = new TornDown();
    await reconcileDedicatedIpPools(
      { entitled: [org], scope: { organizationIds: [org] } },
      deps(pools),
    );
    expect(pools.pools).toEqual([]);
    expect(await getDedicatedIpPool(org)).toBeNull();
  });

  test("a pool created after the teardown deleted the tenant is still released", async () => {
    const tenant = await createTestTenant();
    const org = tenant.organization.id;
    const { api, identity } = sesFixture();
    await ensureOrgTenant(org, identity);
    // The whole teardown (tenant included) runs while the worker is creating the pool.
    class TornDown extends SesDedicatedIpProvider {
      override async ensurePool(input: Parameters<SesDedicatedIpProvider["ensurePool"]>[0]) {
        await requestDeletion(tenant);
        await releaseOrganizationEmailResources(org, {
          identity,
          tracking: new FakeTrackingHostnameProvider(),
          dedicatedIps: this,
        });
        await super.ensurePool(input);
      }
    }
    const pools = new TornDown(api, config);
    await reconcileDedicatedIpPools(
      { entitled: [org], scope: { organizationIds: [org] } },
      { identity, dedicatedIps: pools },
    ).catch(() => 0);
    expect(api.pools.size).toBe(0);
    expect(await getDedicatedIpPool(org)).toBeNull();
  });

  test("releases the pool before the tenant", async () => {
    const tenant = await createTestTenant();
    const org = tenant.organization.id;
    const { api, identity, pools } = sesFixture();
    await ensureOrgTenant(org, identity);
    await reconcileDedicatedIpPools(
      { entitled: [org], scope: { organizationIds: [org] } },
      { identity, dedicatedIps: pools },
    );
    expect((await getDedicatedIpPool(org))?.status).toBe("warming");
    await releaseOrganizationEmailResources(org, {
      identity,
      tracking: new FakeTrackingHostnameProvider(),
      dedicatedIps: pools,
    });
    const ops = api.operations();
    expect(ops.indexOf("deleteDedicatedIpPool")).toBeGreaterThan(-1);
    expect(ops.indexOf("deleteDedicatedIpPool")).toBeLessThan(ops.indexOf("deleteTenant"));
    expect(await getDedicatedIpPool(org)).toBeNull();
    expect(api.pools.size).toBe(0);
  });
});

test("rollups are purged after their retention", async () => {
  const tenant = await createTestTenant();
  const org = tenant.organization.id;
  const now = new Date("2026-10-12T00:00:00Z");
  await db.insert(schema.dedicatedIpDeliveryRollup).values([
    {
      organizationId: org,
      hour: new Date("2026-09-01T00:00:00Z"),
      sendingIp: "203.0.113.7",
      delivered: 1,
    },
    {
      organizationId: org,
      hour: new Date("2026-10-11T00:00:00Z"),
      sendingIp: "203.0.113.7",
      delivered: 1,
    },
  ]);
  expect(await purgeExpiredDedicatedIpRollups({ now, scope: { organizationIds: [org] } })).toBe(1);
});
