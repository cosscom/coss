import { describe, expect, test } from "bun:test";
import { db, schema } from "@coss/db";
import { createTestTenant } from "@coss/tenancy/testing";
import { eq } from "drizzle-orm";
import {
  checkReceivingDomain,
  createReceivingDomain,
  deleteReceivingDomain,
  recheckDueReceivingDomains,
} from "../src/receiving-domains.ts";
import { createVerifiedDomain, fakeDnsResolver } from "../src/testing.ts";
import { domainObjects } from "../src/tracking-domains.ts";

const MX = "inbound-smtp.us-east-1.amazonaws.com";
const config = { mxHost: MX, managedDomain: "inbound.coss.test" };

async function setup() {
  const tenant = await createTestTenant();
  const parent = await createVerifiedDomain(tenant.organization.id);
  const input = {
    organizationId: tenant.organization.id,
    domainId: parent.id,
    environmentId: tenant.production.id,
  };
  return { tenant, parent, input };
}

describe("createReceivingDomain", () => {
  test("accepts the domain or a subdomain and lists the MX to publish", async () => {
    const { parent, input } = await setup();
    const created = await createReceivingDomain(
      { ...input, hostname: `In.${parent.name}.` },
      config,
      null,
    );
    expect(created).toMatchObject({
      hostname: `in.${parent.name}`,
      record: { type: "MX", name: `in.${parent.name}`, value: MX, status: "not_checked" },
    });
    const [object] = await domainObjects(input.organizationId, [parent]);
    expect(object?.receiving).toMatchObject({
      hostname: `in.${parent.name}`,
      environment_id: input.environmentId,
    });
  });

  test("refuses hostnames outside the domain, its MAIL FROM subdomain and a second one", async () => {
    const { parent, input } = await setup();
    const attempt = (hostname: string) =>
      createReceivingDomain({ ...input, hostname }, config, null);
    await expect(attempt("other.example")).rejects.toMatchObject({
      code: "invalid_receiving_hostname",
    });
    await expect(attempt(`send.${parent.name}`)).rejects.toMatchObject({
      code: "invalid_receiving_hostname",
    });
    await expect(attempt(`x.${parent.mailFromDomain}`)).rejects.toMatchObject({
      code: "invalid_receiving_hostname",
    });
    await attempt(parent.name);
    await expect(attempt(`in.${parent.name}`)).rejects.toMatchObject({
      code: "receiving_domain_exists",
    });
  });

  test("refuses an environment of another organization", async () => {
    const { input, parent } = await setup();
    const other = await createTestTenant();
    await expect(
      createReceivingDomain(
        { ...input, environmentId: other.production.id, hostname: parent.name },
        config,
        null,
      ),
    ).rejects.toMatchObject({ code: "not_found" });
  });

  test("a hostname already receiving for another account is taken", async () => {
    const { parent, input } = await setup();
    await createReceivingDomain({ ...input, hostname: `in.${parent.name}` }, config, null);
    const other = await createTestTenant();
    const nested = await createVerifiedDomain(other.organization.id, {
      name: `deep.in.${parent.name}`,
    });
    // The other organization's domain is more specific, but the hostname is the parent's.
    await expect(
      createReceivingDomain(
        {
          organizationId: other.organization.id,
          domainId: nested.id,
          environmentId: other.production.id,
          hostname: `in.${parent.name}`,
        },
        config,
        null,
      ),
    ).rejects.toMatchObject({ code: "invalid_receiving_hostname" });
  });
});

describe("checkReceivingDomain", () => {
  test("verified once the preferred MX points at the inbound host", async () => {
    const { parent, input } = await setup();
    await createReceivingDomain({ ...input, hostname: parent.name }, config, null);
    const mismatch = await checkReceivingDomain(
      input,
      config,
      fakeDnsResolver({
        [`MX ${parent.name}`]: [
          { exchange: "aspmx.l.google.com", priority: 1 },
          { exchange: `${MX}.`, priority: 10 },
        ],
      }),
    );
    expect(mismatch.record).toMatchObject({ status: "mismatch" });
    const verified = await checkReceivingDomain(
      input,
      config,
      fakeDnsResolver({ [`MX ${parent.name}`]: [{ exchange: `${MX}.`, priority: 10 }] }),
    );
    expect(verified.record).toMatchObject({ status: "verified", found: [] });
    expect(verified.nextCheckAt?.getTime()).toBeGreaterThan(Date.now() + 11 * 60 * 60 * 1000);
  });

  test("the worker re-checks due ones and delete removes it", async () => {
    const { tenant, parent, input } = await setup();
    await createReceivingDomain({ ...input, hostname: parent.name }, config, null);
    const checked = await recheckDueReceivingDomains(
      {
        now: new Date(Date.now() + 2 * 60 * 1000),
        scope: { organizationIds: [tenant.organization.id] },
      },
      config,
      fakeDnsResolver({}),
    );
    expect(checked).toBe(1);
    await deleteReceivingDomain(input);
    const rows = await db
      .select()
      .from(schema.receivingDomain)
      .where(eq(schema.receivingDomain.domainId, parent.id));
    expect(rows).toEqual([]);
  });
});
