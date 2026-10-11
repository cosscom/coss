import { describe, expect, test } from "bun:test";
import { db, schema } from "@coss/db";
import { uniqueSuffix } from "@coss/db/testing";
import { createTestTenant } from "@coss/tenancy/testing";
import { eq } from "drizzle-orm";
import {
  CloudflareTrackingHostnameProvider,
  customHostnameState,
} from "../src/cloudflare/custom-hostnames.ts";
import { createDomain, type DomainDeps, deleteDomain } from "../src/domains.ts";
import { DomainError } from "../src/errors.ts";
import { FakeEmailProvider } from "../src/providers/fake.ts";
import { FakeIdentityProvider } from "../src/providers/fake-identity.ts";
import { FakeTrackingHostnameProvider } from "../src/providers/fake-tracking-hostnames.ts";
import { DomainObject } from "../src/schemas.ts";
import { createEmailService } from "../src/service.ts";
import {
  createVerifiedDomain,
  FakeCloudflareApi,
  fakeDnsResolver,
  memoryDispatchQueue,
  trackingUrls,
} from "../src/testing.ts";
import {
  checkTrackingDomain,
  createTrackingDomain,
  deleteTrackingDomain,
  domainObject,
  getTrackingDomain,
  recheckDueTrackingDomains,
  restartTrackingDomain,
  trackingBaseUrlFor,
  verifyTrackingDomain,
} from "../src/tracking-domains.ts";
import { TrackingHostnameTakenError } from "../src/tracking-hostnames.ts";
import { params, sendEnvironment } from "./helpers.ts";

const CNAME_TARGET = "track.coss.test";
const HOUR = 60 * 60 * 1000;

function fakeDeps(tracking = new FakeTrackingHostnameProvider({ cnameTarget: CNAME_TARGET })) {
  return { identity: new FakeIdentityProvider(), dns: null, tracking } satisfies DomainDeps;
}

function cloudflareDeps(dns: DomainDeps["dns"] = null) {
  const api = new FakeCloudflareApi();
  const tracking = new CloudflareTrackingHostnameProvider(
    { apiToken: "token", zoneId: "zone", cnameTarget: CNAME_TARGET },
    { fetch: api.fetch, baseUrl: "https://cf.test/client/v4" },
  );
  return { api, deps: { identity: new FakeIdentityProvider(), dns, tracking } };
}

async function setup() {
  const tenant = await createTestTenant();
  const organizationId = tenant.organization.id;
  const domain = await createVerifiedDomain(organizationId);
  return { tenant, organizationId, domain };
}

async function expectDomainError(promise: Promise<unknown>, code: string): Promise<DomainError> {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(DomainError);
  expect((error as DomainError).code).toBe(code as DomainError["code"]);
  return error as DomainError;
}

describe("hostname rules", () => {
  test("must be a subdomain of the domain, outside its MAIL FROM subdomain", async () => {
    const { organizationId, domain } = await setup();
    const deps = fakeDeps();
    const create = (hostname: string) =>
      createTrackingDomain({ organizationId, domainId: domain.id, hostname }, deps);

    await expectDomainError(create(domain.name), "invalid_tracking_hostname");
    await expectDomainError(create("links.example.com"), "invalid_tracking_hostname");
    await expectDomainError(create(`links.x${domain.name}`), "invalid_tracking_hostname");
    await expectDomainError(create(`x.send.${domain.name}`), "invalid_tracking_hostname");
    await expectDomainError(create(`send.${domain.name}`), "invalid_tracking_hostname");
    await expectDomainError(create("https://links/x"), "invalid_tracking_hostname");

    const row = await create(` Links.${domain.name.toUpperCase()}. `);
    expect(row.hostname).toBe(`links.${domain.name}`);
  });

  test("can't sit under another organization's more specific domain", async () => {
    const { organizationId, domain } = await setup();
    const other = await createTestTenant();
    await createVerifiedDomain(other.organization.id, { name: `mail.${domain.name}` });
    const error = await expectDomainError(
      createTrackingDomain(
        { organizationId, domainId: domain.id, hostname: `links.mail.${domain.name}` },
        fakeDeps(),
      ),
      "invalid_tracking_hostname",
    );
    expect(error.message).toContain(`mail.${domain.name}`);
  });

  test("one per domain, and a hostname belongs to one domain at a time", async () => {
    const { organizationId, domain } = await setup();
    const deps = fakeDeps();
    await createTrackingDomain(
      { organizationId, domainId: domain.id, hostname: `links.${domain.name}` },
      deps,
    );
    await expectDomainError(
      createTrackingDomain(
        { organizationId, domainId: domain.id, hostname: `t.${domain.name}` },
        deps,
      ),
      "tracking_domain_exists",
    );
  });

  test("another organization's domain is not found", async () => {
    const { domain } = await setup();
    const other = await createTestTenant();
    await expectDomainError(
      createTrackingDomain(
        {
          organizationId: other.organization.id,
          domainId: domain.id,
          hostname: `links.${domain.name}`,
        },
        fakeDeps(),
      ),
      "not_found",
    );
  });
});

describe("lifecycle with the fake provider", () => {
  test("active at once, shown on the domain object", async () => {
    const { organizationId, domain } = await setup();
    const row = await createTrackingDomain(
      { organizationId, domainId: domain.id, hostname: `links.${domain.name}` },
      fakeDeps(),
    );
    expect(row.status).toBe("active");
    expect(row.activatedAt).not.toBeNull();
    const object = await domainObject(domain);
    expect(DomainObject.parse(object)).toEqual(object);
    expect(object.tracking).toMatchObject({
      hostname: `links.${domain.name}`,
      status: "active",
      record: {
        type: "CNAME",
        name: `links.${domain.name}`,
        value: CNAME_TARGET,
        status: "not_checked",
      },
      message: null,
    });
  });

  test("a domain without one has tracking null", async () => {
    const { domain } = await setup();
    expect((await domainObject(domain)).tracking).toBeNull();
  });

  test("a provider failure on create releases the claim", async () => {
    const { organizationId, domain } = await setup();
    const tracking = new FakeTrackingHostnameProvider();
    tracking.create = async (hostname) => {
      throw new TrackingHostnameTakenError(hostname);
    };
    await expectDomainError(
      createTrackingDomain(
        { organizationId, domainId: domain.id, hostname: `links.${domain.name}` },
        fakeDeps(tracking),
      ),
      "tracking_domain_taken",
    );
    tracking.create = async () => {
      throw new Error("boom");
    };
    await expectDomainError(
      createTrackingDomain(
        { organizationId, domainId: domain.id, hostname: `links.${domain.name}` },
        fakeDeps(tracking),
      ),
      "provider_error",
    );
    expect((await domainObject(domain)).tracking).toBeNull();
  });

  test("deleting it removes the hostname at the provider", async () => {
    const { organizationId, domain } = await setup();
    const tracking = new FakeTrackingHostnameProvider();
    const deps = fakeDeps(tracking);
    await createTrackingDomain(
      { organizationId, domainId: domain.id, hostname: `links.${domain.name}` },
      deps,
    );
    expect(tracking.hostnames).toEqual([`links.${domain.name}`]);
    await deleteTrackingDomain({ organizationId, domainId: domain.id }, deps);
    expect(tracking.hostnames).toEqual([]);
    expect((await domainObject(domain)).tracking).toBeNull();
    await expectDomainError(
      deleteTrackingDomain({ organizationId, domainId: domain.id }, deps),
      "not_found",
    );
  });

  test("deleting the domain removes its tracking hostname too", async () => {
    const tenant = await createTestTenant();
    const organizationId = tenant.organization.id;
    const tracking = new FakeTrackingHostnameProvider();
    const deps = fakeDeps(tracking);
    const domain = await createDomain(
      { organizationId, name: `t-${uniqueSuffix()}.coss.test`, userId: null },
      deps,
    );
    await createTrackingDomain(
      { organizationId, domainId: domain.id, hostname: `links.${domain.name}` },
      deps,
    );
    await deleteDomain({ organizationId, id: domain.id }, deps);
    expect(tracking.hostnames).toEqual([]);
    const rows = await db
      .select()
      .from(schema.trackingDomain)
      .where(eq(schema.trackingDomain.domainId, domain.id));
    expect(rows).toEqual([]);
  });
});

describe("lifecycle with Cloudflare", () => {
  test("pending until Cloudflare serves it; the CNAME check is reported", async () => {
    const { organizationId, domain } = await setup();
    const hostname = `links.${domain.name}`;
    const dns = fakeDnsResolver({ [`CNAME ${hostname}`]: ["other.example.net"] });
    const { api, deps } = cloudflareDeps(dns);

    const row = await createTrackingDomain({ organizationId, domainId: domain.id, hostname }, deps);
    expect(row.status).toBe("pending");
    expect(row.record).toMatchObject({ status: "mismatch", found: ["other.example.net"] });
    expect(api.calls[0]).toMatchObject({
      method: "POST",
      path: "/client/v4/zones/zone/custom_hostnames",
      body: { hostname, ssl: { method: "http", type: "dv" } },
    });

    api.activate(hostname);
    const active = await checkTrackingDomain({ organizationId, domainId: domain.id }, deps);
    expect(active.status).toBe("active");
    expect(active.activatedAt).not.toBeNull();

    // The CNAME was removed: links fall back to the default host until it is back.
    api.set(hostname, { status: "moved" });
    const moved = await checkTrackingDomain({ organizationId, domainId: domain.id }, deps);
    expect(moved.status).toBe("temporary_failure");
    expect(moved.providerMessage).toContain(CNAME_TARGET);

    api.activate(hostname);
    expect((await checkTrackingDomain({ organizationId, domainId: domain.id }, deps)).status).toBe(
      "active",
    );
  });

  test("never activated within 72 hours: fails, releases the hostname, and can restart", async () => {
    const { organizationId, domain } = await setup();
    const hostname = `links.${domain.name}`;
    const { api, deps } = cloudflareDeps();
    await createTrackingDomain({ organizationId, domainId: domain.id, hostname }, deps);

    const later = new Date(Date.now() + 73 * HOUR);
    const failed = await checkTrackingDomain(
      { organizationId, domainId: domain.id, now: later },
      deps,
    );
    expect(failed.status).toBe("failed");
    expect(failed.providerHostnameId).toBeNull();
    expect(api.find(hostname)).toBeUndefined();

    const restarted = await restartTrackingDomain({ organizationId, domainId: domain.id }, deps);
    expect(restarted.status).toBe("pending");
    expect(api.find(hostname)).toBeDefined();

    api.activate(hostname);
    expect(
      (await verifyTrackingDomain({ organizationId, domainId: domain.id }, deps))?.status,
    ).toBe("active");
  });

  test("a hostname Cloudflare gave up on, or no longer knows, fails", async () => {
    const { organizationId, domain } = await setup();
    const hostname = `links.${domain.name}`;
    const { api, deps } = cloudflareDeps();
    await createTrackingDomain({ organizationId, domainId: domain.id, hostname }, deps);
    api.set(hostname, {
      ssl: { status: "validation_timed_out", validation_errors: [{ message: "No CNAME" }] },
    });
    const failed = await checkTrackingDomain({ organizationId, domainId: domain.id }, deps);
    expect(failed).toMatchObject({ status: "failed", providerMessage: "No CNAME" });

    await restartTrackingDomain({ organizationId, domainId: domain.id }, deps);
    api.hostnames.clear();
    const gone = await checkTrackingDomain({ organizationId, domainId: domain.id }, deps);
    expect(gone.status).toBe("failed");
  });

  test("a hostname registered elsewhere in the zone is never adopted", async () => {
    const { organizationId, domain } = await setup();
    const hostname = `links.${domain.name}`;
    const { api, deps } = cloudflareDeps();
    await api.fetch("https://cf.test/client/v4/zones/zone/custom_hostnames", {
      method: "POST",
      body: JSON.stringify({ hostname }),
    });
    await expectDomainError(
      createTrackingDomain({ organizationId, domainId: domain.id, hostname }, deps),
      "tracking_domain_taken",
    );
  });

  test("a Cloudflare error on delete keeps the tracking domain", async () => {
    const { organizationId, domain } = await setup();
    const hostname = `links.${domain.name}`;
    const { api, deps } = cloudflareDeps();
    await createTrackingDomain({ organizationId, domainId: domain.id, hostname }, deps);
    api.failNext = 500;
    await expectDomainError(
      deleteTrackingDomain({ organizationId, domainId: domain.id }, deps),
      "provider_error",
    );
    expect((await domainObject(domain)).tracking?.status).toBe("pending");
    await deleteTrackingDomain({ organizationId, domainId: domain.id }, deps);
    expect(api.find(hostname)).toBeUndefined();
  });

  test("the worker re-checks due tracking domains of its provider", async () => {
    const { organizationId, domain } = await setup();
    const hostname = `links.${domain.name}`;
    const { api, deps } = cloudflareDeps();
    await createTrackingDomain({ organizationId, domainId: domain.id, hostname }, deps);
    api.activate(hostname);
    const scope = { organizationIds: [organizationId] };

    expect(await recheckDueTrackingDomains({ scope }, deps)).toBe(0);
    const later = new Date(Date.now() + 2 * 60 * 1000);
    expect(await recheckDueTrackingDomains({ scope, now: later }, fakeDeps())).toBe(0);
    expect(await recheckDueTrackingDomains({ scope, now: later }, deps)).toBe(1);
    expect((await domainObject(domain)).tracking?.status).toBe("active");
    // Leased: a second worker at the same moment finds nothing due.
    expect(await recheckDueTrackingDomains({ scope, now: later }, deps)).toBe(0);
  });
});

describe("customHostnameState", () => {
  test("active needs both the hostname and its certificate", () => {
    const state = (status: string, ssl: string) =>
      customHostnameState({ id: "x", hostname: "h", status, ssl: { status: ssl } }, "t").status;
    expect(state("active", "active")).toBe("active");
    expect(state("active", "pending_validation")).toBe("pending");
    expect(state("pending", "active")).toBe("pending");
    expect(state("blocked", "active")).toBe("failed");
    expect(state("active", "expired")).toBe("failed");
  });
});

describe("sending through a tracking domain", () => {
  const HTML = '<html><body><a href="https://acme.com/one">1</a></body></html>';

  async function sendFrom(
    tenant: Awaited<ReturnType<typeof createTestTenant>>,
    from: string,
    trackingDomainProvider: string | null = "fake",
  ) {
    const provider = new FakeEmailProvider({ log: false });
    const queue = memoryDispatchQueue();
    const service = createEmailService({
      liveProvider: provider,
      sandboxProvider: provider,
      trackingBaseUrl: "https://api.coss.test",
      trackingDomainProvider: trackingDomainProvider ?? undefined,
      queue,
    });
    await service.send({
      environment: sendEnvironment(tenant.production),
      apiKeyId: null,
      params: params({ from, html: HTML, tracking: { opens: true, clicks: true } }),
    });
    await queue.drain(service);
    return trackingUrls(provider.sent.at(-1)?.html ?? "");
  }

  test("emails from the domain use its active tracking domain", async () => {
    const { tenant, organizationId, domain } = await setup();
    const hostname = `links.${domain.name}`;
    await createTrackingDomain({ organizationId, domainId: domain.id, hostname }, fakeDeps());

    const urls = await sendFrom(tenant, `hello@${domain.name}`);
    expect(urls.open).toStartWith(`https://${hostname}/t/o/`);
    expect(urls.clicks[0]).toStartWith(`https://${hostname}/t/c/`);
  });

  test("otherwise the default tracking host", async () => {
    const { tenant, organizationId, domain } = await setup();
    const hostname = `links.${domain.name}`;
    const tracking = new FakeTrackingHostnameProvider({
      state: () => ({ status: "pending", message: null }),
    });
    await createTrackingDomain(
      { organizationId, domainId: domain.id, hostname },
      fakeDeps(tracking),
    );
    // Not active yet.
    expect((await sendFrom(tenant, `hello@${domain.name}`)).open).toStartWith(
      "https://api.coss.test/t/o/",
    );

    const other = await setup();
    await createTrackingDomain(
      {
        organizationId: other.organizationId,
        domainId: other.domain.id,
        hostname: `links.${other.domain.name}`,
      },
      fakeDeps(),
    );
    // Another provider's tracking domain, or no provider configured.
    expect(
      (await sendFrom(other.tenant, `hi@${other.domain.name}`, "cloudflare")).open,
    ).toStartWith("https://api.coss.test/t/o/");
    expect((await sendFrom(other.tenant, `hi@${other.domain.name}`, null)).open).toStartWith(
      "https://api.coss.test/t/o/",
    );
  });

  test("a subdomain sender uses its most specific domain's tracking domain only", async () => {
    const { organizationId, domain } = await setup();
    await createTrackingDomain(
      { organizationId, domainId: domain.id, hostname: `links.${domain.name}` },
      fakeDeps(),
    );
    const base = (from: string, org = organizationId) =>
      trackingBaseUrlFor({ organizationId: org, from, provider: "fake" });
    expect(await base(`a@news.${domain.name}`)).toBe(`https://links.${domain.name}`);
    await createVerifiedDomain(organizationId, { name: `mail.${domain.name}` });
    expect(await base(`a@mail.${domain.name}`)).toBeNull();
    expect(await base(`a@${domain.name}`, (await createTestTenant()).organization.id)).toBeNull();
    expect(await base("not an address")).toBeNull();
  });
});

describe("tracking lifecycle recovery", () => {
  test.each(["expired", "failed"])(
    "retries cleanup after %s without losing the provider ID",
    async (reason) => {
      const { organizationId, domain } = await setup();
      const { api, deps } = cloudflareDeps();
      const input = { organizationId, domainId: domain.id };
      const hostname = `links.${domain.name}`;
      const created = await createTrackingDomain({ ...input, hostname }, deps);
      if (reason === "failed") api.set(hostname, { status: "blocked" });
      const remove = deps.tracking.delete.bind(deps.tracking);
      let fail = true;
      deps.tracking.delete = async (id) => {
        if (fail) throw new Error("cleanup unavailable");
        await remove(id);
      };
      const now = new Date(Date.now() + 73 * HOUR);
      const failed = await checkTrackingDomain({ ...input, now }, deps);
      expect(failed.status).toBe("failed");
      expect(failed.providerHostnameId).toBe(created.providerHostnameId);
      expect(failed.nextCheckAt).not.toBeNull();
      const restarted = await restartTrackingDomain(input, deps);
      expect(restarted.status).toBe("failed");
      expect(restarted.providerHostnameId).toBe(created.providerHostnameId);
      expect(api.calls.filter((call) => call.method === "POST")).toHaveLength(1);
      const scope = { organizationIds: [organizationId] };
      expect(await recheckDueTrackingDomains({ scope, now }, deps)).toBe(1);
      expect((await getTrackingDomain(input))?.providerHostnameId).toBe(created.providerHostnameId);
      fail = false;
      expect(
        await recheckDueTrackingDomains({ scope, now: new Date(now.getTime() + HOUR) }, deps),
      ).toBe(1);
      expect(await getTrackingDomain(input)).toMatchObject({
        status: "failed",
        providerHostnameId: null,
        nextCheckAt: null,
      });
      expect(api.find(hostname)).toBeUndefined();
      expect((await restartTrackingDomain(input, deps)).status).toBe("pending");
    },
  );

  test("verification during creation and restart waits for provisioning", async () => {
    const { organizationId, domain } = await setup();
    const deps = fakeDeps();
    const input = { organizationId, domainId: domain.id };
    const create = deps.tracking.create.bind(deps.tracking);
    for (const restarting of [false, true]) {
      const entered = Promise.withResolvers<void>();
      const release = Promise.withResolvers<void>();
      deps.tracking.create = async (hostname) => {
        entered.resolve();
        await release.promise;
        return create(hostname);
      };
      const provisioning = restarting
        ? restartTrackingDomain(input, deps)
        : createTrackingDomain({ ...input, hostname: `links.${domain.name}` }, deps);
      await entered.promise;
      try {
        expect(await verifyTrackingDomain(input, deps)).toMatchObject({
          status: "pending",
          providerHostnameId: null,
        });
      } finally {
        release.resolve();
      }
      const active = await provisioning;
      expect(active.status).toBe("active");
      expect(active.providerHostnameId).not.toBeNull();
      if (!active.providerHostnameId) throw new Error("Missing provisioned hostname ID");
      await deps.tracking.delete(active.providerHostnameId);
      await db
        .update(schema.trackingDomain)
        .set({
          status: "failed",
          providerHostnameId: null,
          nextCheckAt: null,
        })
        .where(eq(schema.trackingDomain.id, active.id));
    }
  });

  test("SES deletion failure leaves released tracking inactive and restartable", async () => {
    const { organizationId, domain } = await setup();
    const deps = fakeDeps();
    const input = { organizationId, domainId: domain.id };
    await createTrackingDomain({ ...input, hostname: `links.${domain.name}` }, deps);
    deps.identity.deleteDomainIdentity = async () => {
      throw new Error("SES unavailable");
    };
    await expectDomainError(
      deleteDomain({ organizationId, id: domain.id }, deps),
      "provider_error",
    );
    expect(await getTrackingDomain(input)).toMatchObject({
      status: "failed",
      providerHostnameId: null,
      nextCheckAt: null,
    });
    expect(
      await trackingBaseUrlFor({ organizationId, from: `hi@${domain.name}`, provider: "fake" }),
    ).toBeNull();
    expect((await restartTrackingDomain(input, deps)).status).toBe("active");
  });
});
