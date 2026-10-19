import { describe, expect, test } from "bun:test";
import { db, schema } from "@coss/db";
import { uniqueSuffix } from "@coss/db/testing";
import {
  createDomain,
  type DomainDeps,
  FakeIdentityProvider,
  FakeTrackingHostnameProvider,
  listDomains,
} from "@coss/email";
import { createTestTenant } from "@coss/tenancy/testing";
import { TEST_SECRETS_KEYS } from "@coss/webhooks/testing";
import { eq } from "drizzle-orm";
import {
  cancelMigration,
  connectMigration,
  getMigration,
  importDomains,
  listMigrationItems,
} from "../src/index.ts";

const deps = (): DomainDeps => ({
  identity: new FakeIdentityProvider(),
  dns: null,
  tracking: new FakeTrackingHostnameProvider(),
});

describe("importDomains", () => {
  test("creates the chosen domains, finds existing ones, and retries one left pending", async () => {
    const tenant = await createTestTenant();
    const env = { organizationId: tenant.organization.id, environmentId: tenant.development.id };
    const suffix = uniqueSuffix();
    const [a, b, c] = ["a", "b", "c"].map((label) => `${label}-${suffix}.example.com`) as [
      string,
      string,
      string,
    ];
    const names = [a, b, c];
    const row = await connectMigration(
      env,
      { provider: "resend", apiKey: "re_test_key_0123456789", options: {}, userId: null },
      { secretsKeys: TEST_SECRETS_KEYS },
    );
    if (!row) throw new Error("not connected");
    await db
      .update(schema.migration)
      .set({
        status: "ready",
        inventory: {
          domains: names.map((name, index) => ({ id: `d${index}`, name, verified: true })),
        },
      })
      .where(eq(schema.migration.id, row.id));
    const ready = await getMigration(env, row.id);
    if (!ready) throw new Error("missing");
    await createDomain({ organizationId: env.organizationId, name: b, userId: null }, deps());
    // An earlier start that stopped after recording the first domain, before creating it.
    await db.insert(schema.migrationItem).values({
      migrationId: row.id,
      organizationId: env.organizationId,
      kind: "domain",
      sourceId: "d0",
      sourceName: a,
      targetName: a,
    });

    const results = await importDomains(ready, ["d0", "d1", "d2"], { userId: null }, deps());
    expect(results.map((r) => [r.name, r.result.outcome])).toEqual([
      [a, "created"],
      [b, "existing"],
      [c, "created"],
    ]);
    // Starting again changes nothing.
    expect(await importDomains(ready, ["d0", "d1", "d2"], { userId: null }, deps())).toEqual([]);
    const domains = await listDomains({ organizationId: env.organizationId });
    expect(domains.map((d) => d.name).sort()).toEqual([a, b, c].sort());
    expect((await listMigrationItems(env, row.id)).every((item) => item.targetId)).toBe(true);
  });

  test("creates nothing once the import was canceled", async () => {
    const tenant = await createTestTenant();
    const env = { organizationId: tenant.organization.id, environmentId: tenant.development.id };
    const name = `late-${uniqueSuffix()}.example.com`;
    const row = await connectMigration(
      env,
      { provider: "resend", apiKey: "re_test_key_0123456789", options: {}, userId: null },
      { secretsKeys: TEST_SECRETS_KEYS },
    );
    if (!row) throw new Error("not connected");
    await db
      .update(schema.migration)
      .set({ status: "ready", inventory: { domains: [{ id: "d0", name, verified: true }] } })
      .where(eq(schema.migration.id, row.id));
    const ready = await getMigration(env, row.id);
    if (!ready) throw new Error("missing");
    await cancelMigration(env, row.id);
    expect(await importDomains(ready, ["d0"], { userId: null }, deps())).toEqual([]);
    expect(await listDomains({ organizationId: env.organizationId })).toEqual([]);
  });
});
