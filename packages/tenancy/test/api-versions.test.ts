import { describe, expect, test } from "bun:test";
import { db, schema } from "@coss/db";
import { versioning } from "@coss/versioning";
import { eq } from "drizzle-orm";
import {
  authenticateApiKey,
  getOrganizationApiVersion,
  setOrganizationApiVersion,
  TenancyError,
} from "../src/index.ts";
import { createTestTenant } from "../src/testing.ts";

const { organizationApiVersion } = schema;

async function pinRows(organizationId: string) {
  return db
    .select()
    .from(organizationApiVersion)
    .where(eq(organizationApiVersion.organizationId, organizationId));
}

describe("organization API version", () => {
  test("is pinned to the latest version on first use, once, even under concurrency", async () => {
    const tenant = await createTestTenant();
    const organizationId = tenant.organization.id;
    expect(await pinRows(organizationId)).toHaveLength(0);

    const versions = await Promise.all(
      Array.from({ length: 5 }, () => getOrganizationApiVersion({ organizationId })),
    );
    expect(new Set(versions)).toEqual(new Set([versioning.latest]));
    expect(await pinRows(organizationId)).toHaveLength(1);
  });

  test("authenticateApiKey reports the pin, pinning on the first request", async () => {
    const tenant = await createTestTenant();
    const first = await authenticateApiKey(tenant.sandboxKey);
    expect(first.ok && first.context.apiVersion).toBe(versioning.latest);
    expect(await pinRows(tenant.organization.id)).toHaveLength(1);

    // An older pin (written directly, as an organization pinned before a newer version shipped) is returned as is.
    await db
      .update(organizationApiVersion)
      .set({ apiVersion: "2000-01-01" })
      .where(eq(organizationApiVersion.organizationId, tenant.organization.id));
    const second = await authenticateApiKey(tenant.liveKey);
    expect(second.ok && second.context.apiVersion).toBe("2000-01-01");
  });

  test("setOrganizationApiVersion upgrades, refuses unknown versions and downgrades", async () => {
    const tenant = await createTestTenant();
    const organizationId = tenant.organization.id;
    await getOrganizationApiVersion({ organizationId });
    await db
      .update(organizationApiVersion)
      .set({ apiVersion: "2000-01-01" })
      .where(eq(organizationApiVersion.organizationId, organizationId));

    await expect(
      setOrganizationApiVersion({ organizationId, apiVersion: "2000-02-30", userId: null }),
    ).rejects.toBeInstanceOf(TenancyError);

    await setOrganizationApiVersion({
      organizationId,
      apiVersion: versioning.latest,
      userId: tenant.owner.id,
    });
    const [row] = await pinRows(organizationId);
    expect(row?.apiVersion).toBe(versioning.latest);
    expect(row?.updatedByUserId).toBe(tenant.owner.id);

    // Setting the current version again is a no-op; an older one would be a downgrade.
    await setOrganizationApiVersion({
      organizationId,
      apiVersion: versioning.latest,
      userId: null,
    });
    await db
      .update(organizationApiVersion)
      .set({ apiVersion: "2999-01-01" })
      .where(eq(organizationApiVersion.organizationId, organizationId));
    await expect(
      setOrganizationApiVersion({ organizationId, apiVersion: versioning.latest, userId: null }),
    ).rejects.toThrow("already uses API version 2999-01-01");
  });
});
