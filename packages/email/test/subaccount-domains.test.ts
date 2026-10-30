import { describe, expect, test } from "bun:test";
import { db, schema } from "@coss/db";
import { uniqueSuffix } from "@coss/db/testing";
import { createTestTenant } from "@coss/tenancy/testing";
import { and, eq } from "drizzle-orm";
import { reconcileDedicatedIpPools } from "../src/dedicated-ips.ts";
import {
  applyTenantStatus,
  checkDomain,
  createDomain,
  type DomainDeps,
  ensureSubaccountTenant,
  MAX_SUBACCOUNT_DOMAINS,
  releaseOrganizationEmailResources,
  releaseSubaccountEmailResources,
  restartDomainVerification,
  setDomainSharedWithSubaccounts,
} from "../src/domains.ts";
import { DomainError } from "../src/errors.ts";
import type { ProviderTenant } from "../src/provider.ts";
import { FakeEmailProvider } from "../src/providers/fake.ts";
import { FakeDedicatedIpProvider } from "../src/providers/fake-dedicated-ips.ts";
import { FakeIdentityProvider } from "../src/providers/fake-identity.ts";
import { FakeTrackingHostnameProvider } from "../src/providers/fake-tracking-hostnames.ts";
import { createSubaccount } from "../src/subaccounts.ts";
import { dispatchingEmailService } from "../src/testing.ts";
import { params, sendEnvironment } from "./helpers.ts";

const uniqueName = () => `t-${uniqueSuffix()}.coss.test`;

function deps(): DomainDeps {
  return {
    identity: new FakeIdentityProvider(),
    dns: null,
    tracking: new FakeTrackingHostnameProvider(),
  };
}

async function setup() {
  const tenant = await createTestTenant();
  const organizationId = tenant.organization.id;
  const live = { organizationId, environmentId: tenant.production.id };
  const a = await createSubaccount({ ...live, name: "A", uid: "a" });
  const b = await createSubaccount({ ...live, name: "B", uid: "b" });
  const domainDeps = deps();
  const verified = async (subaccountId: string | null) => {
    const row = await createDomain(
      { organizationId, name: uniqueName(), userId: null, subaccountId },
      domainDeps,
    );
    return checkDomain({ organizationId, id: row.id }, domainDeps);
  };
  const provider = new FakeEmailProvider({ log: false });
  const service = dispatchingEmailService({ liveProvider: provider, sandboxProvider: provider });
  const send = (from: string, subaccount?: string) =>
    service.send({
      environment: sendEnvironment(tenant.production),
      apiKeyId: null,
      params: params({ from: `hello@${from}`, ...(subaccount ? { subaccount } : {}) }),
    });
  return { tenant, organizationId, a, b, domainDeps, verified, provider, send };
}

const refusal = (promise: Promise<unknown>) => promise.then(() => null).catch((error) => error);

describe("sub-account domains", () => {
  test("a sub-account's first domain gets it its own tenant, and its mail goes through it", async () => {
    const { organizationId, a, verified, provider, send } = await setup();
    const domain = await verified(a.id);
    expect(domain).toMatchObject({ subaccountId: a.id, status: "verified", canSend: true });
    const tenants = await db
      .select()
      .from(schema.emailTenant)
      .where(eq(schema.emailTenant.organizationId, organizationId));
    expect(tenants.map((row) => [row.subaccountId, row.tenantName])).toEqual([
      [a.id, `fake-${a.id}`],
    ]);
    // Born without the provider's suppression, like every new tenant.
    expect(tenants[0]?.suppressionMigratedAt).not.toBeNull();

    const { email } = await send(domain.name, "a");
    expect(email.status).toBe("sent");
    expect(provider.sent.at(-1)).toMatchObject({ tenantSubaccountId: a.id, dedicatedPool: false });
  });

  test("through a shared domain a sub-account's mail is the organization's, dedicated IPs included", async () => {
    const { organizationId, a, verified, domainDeps, provider, send } = await setup();
    const own = await verified(a.id);
    const shared = await verified(null);
    await setDomainSharedWithSubaccounts({ organizationId, id: shared.id, shared: true });
    await reconcileDedicatedIpPools(
      { entitled: [organizationId], scope: { organizationIds: [organizationId] } },
      { identity: domainDeps.identity, dedicatedIps: new FakeDedicatedIpProvider() },
    );
    await send(shared.name, "a");
    expect(provider.sent.at(-1)).toMatchObject({ tenantSubaccountId: null, dedicatedPool: true });
    // Its own tenant can't use the organization's pool (its configuration set).
    await send(own.name, "a");
    expect(provider.sent.at(-1)).toMatchObject({ tenantSubaccountId: a.id, dedicatedPool: false });
  });

  test("restarting a failed domain's verification counts toward the sub-account's domains", async () => {
    const { organizationId, a, verified, domainDeps } = await setup();
    const failed = await verified(a.id);
    await db
      .update(schema.domain)
      .set({ status: "failed", canSend: false })
      .where(eq(schema.domain.id, failed.id));
    for (let i = 0; i < MAX_SUBACCOUNT_DOMAINS; i++) await verified(a.id);
    expect(
      await refusal(restartDomainVerification({ organizationId, id: failed.id }, domainDeps)),
    ).toMatchObject({ code: "too_many_subaccount_domains" });
  });

  test("a tenant made for a sub-account deleted meanwhile is released at once", async () => {
    const { organizationId, a } = await setup();
    // Gone (its teardown found no tenant row) while the provider made its tenant.
    await db.delete(schema.emailSubaccount).where(eq(schema.emailSubaccount.id, a.id));
    const identity = new FakeIdentityProvider();
    const released: string[] = [];
    identity.deleteTenant = async (tenant: ProviderTenant) => {
      released.push(tenant.tenantName);
    };
    expect(await refusal(ensureSubaccountTenant(organizationId, a.id, identity))).toMatchObject({
      code: "subaccount_not_found",
    });
    expect(released).toEqual([`fake-${a.id}`]);
  });

  test("only its sub-account sends from a sub-account's domain", async () => {
    const { a, verified, send } = await setup();
    const domain = await verified(a.id);
    expect(await refusal(send(domain.name, "b"))).toMatchObject({
      code: "domain_not_verified",
      message: expect.stringContaining("another sub-account"),
    });
    expect(await refusal(send(domain.name))).toMatchObject({
      code: "domain_not_verified",
      message: expect.stringContaining("belongs to a sub-account"),
    });
  });

  test("sub-accounts send from the organization's domains only once they are shared", async () => {
    const { organizationId, verified, provider, send } = await setup();
    const own = await verified(null);
    expect(await refusal(send(own.name, "a"))).toMatchObject({ code: "domain_not_verified" });

    await setDomainSharedWithSubaccounts({ organizationId, id: own.id, shared: true });
    const { email } = await send(own.name, "a");
    expect(email.status).toBe("sent");
    // The organization's tenant: the domain is its own.
    expect(provider.sent.at(-1)?.tenantSubaccountId).toBeNull();
    // The organization still sends from it itself.
    expect((await send(own.name)).email.status).toBe("sent");
  });

  test("a sub-account's domain is never shared, and sub-account domains need a live one", async () => {
    const { tenant, organizationId, a, verified, domainDeps } = await setup();
    const domain = await verified(a.id);
    expect(
      await refusal(
        setDomainSharedWithSubaccounts({ organizationId, id: domain.id, shared: true }),
      ),
    ).toMatchObject({ code: "not_shareable" });

    const sandbox = await createSubaccount({
      organizationId,
      environmentId: tenant.development.id,
      name: "S",
    });
    const refused = await refusal(
      createDomain(
        { organizationId, name: uniqueName(), userId: null, subaccountId: sandbox.id },
        domainDeps,
      ),
    );
    expect(refused).toBeInstanceOf(DomainError);
    expect(refused).toMatchObject({ code: "subaccount_not_live" });
  });

  test("the provider pausing a sub-account's tenant pauses only that sub-account", async () => {
    const { a, b, verified, send } = await setup();
    const domainA = await verified(a.id);
    const domainB = await verified(b.id);
    expect(
      await applyTenantStatus(
        {
          tenantName: `fake-${a.id}`,
          status: "disabled",
          cause: "Bounces",
          occurredAt: new Date(),
        },
        "fake",
      ),
    ).toBe(true);
    expect(await refusal(send(domainA.name, "a"))).toMatchObject({ code: "sending_paused" });
    expect((await send(domainB.name, "b")).email.status).toBe("sent");
  });

  test("deleting a sub-account releases its domains and tenant; so does deleting the organization", async () => {
    const { organizationId, a, b, verified, domainDeps } = await setup();
    const domainA = await verified(a.id);
    await verified(b.id);
    await verified(null);

    await releaseSubaccountEmailResources(a, domainDeps);
    const remaining = await db
      .select({ name: schema.domain.name, subaccountId: schema.domain.subaccountId })
      .from(schema.domain)
      .where(eq(schema.domain.organizationId, organizationId));
    expect(remaining.map((row) => row.name)).not.toContain(domainA.name);
    expect(remaining).toHaveLength(2);
    expect(
      await db
        .select()
        .from(schema.emailTenant)
        .where(
          and(
            eq(schema.emailTenant.organizationId, organizationId),
            eq(schema.emailTenant.subaccountId, a.id),
          ),
        ),
    ).toEqual([]);

    await releaseOrganizationEmailResources(organizationId, domainDeps);
    expect(
      await db.select().from(schema.domain).where(eq(schema.domain.organizationId, organizationId)),
    ).toEqual([]);
    expect(
      await db
        .select()
        .from(schema.emailTenant)
        .where(eq(schema.emailTenant.organizationId, organizationId)),
    ).toEqual([]);
  });
});
