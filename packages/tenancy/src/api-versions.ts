import { db, type Executor, schema } from "@coss/db";
import { versioning } from "@coss/versioning";
import { eq, sql } from "drizzle-orm";
import { TenancyError } from "./errors.ts";

const { organizationApiVersion } = schema;

/**
 * The API version the organization's requests use without a `Coss-Version` header. The first call pins an
 * organization that has none to the latest version (concurrent first calls agree on one row).
 */
export async function getOrganizationApiVersion(
  input: { organizationId: string },
  executor: Executor = db,
): Promise<string> {
  const [inserted] = await executor
    .insert(organizationApiVersion)
    .values({ organizationId: input.organizationId, apiVersion: versioning.latest })
    .onConflictDoNothing()
    .returning({ apiVersion: organizationApiVersion.apiVersion });
  if (inserted) return inserted.apiVersion;
  const [row] = await executor
    .select({ apiVersion: organizationApiVersion.apiVersion })
    .from(organizationApiVersion)
    .where(eq(organizationApiVersion.organizationId, input.organizationId));
  if (!row) throw new Error(`organization_api_version vanished for ${input.organizationId}`);
  return row.apiVersion;
}

/** The organization's pinned API version without pinning it; `null` until its first API request. */
export async function readOrganizationApiVersion(input: {
  organizationId: string;
}): Promise<string | null> {
  const [row] = await db
    .select({ apiVersion: organizationApiVersion.apiVersion })
    .from(organizationApiVersion)
    .where(eq(organizationApiVersion.organizationId, input.organizationId));
  return row?.apiVersion ?? null;
}

/**
 * Upgrades the organization's pinned API version. Versions only move forward: going back would silently change
 * every integration that relies on the default (send `Coss-Version` to test an older version instead).
 */
export async function setOrganizationApiVersion(input: {
  organizationId: string;
  apiVersion: string;
  userId: string | null;
}): Promise<void> {
  if (!versioning.isVersion(input.apiVersion)) {
    throw new TenancyError("invalid", `Unknown API version ${input.apiVersion}.`);
  }
  const current = await getOrganizationApiVersion(input);
  if (input.apiVersion < current) {
    throw new TenancyError("invalid", `The organization already uses API version ${current}.`);
  }
  if (input.apiVersion === current) return;
  await db
    .update(organizationApiVersion)
    .set({ apiVersion: input.apiVersion, updatedByUserId: input.userId })
    .where(
      sql`${organizationApiVersion.organizationId} = ${input.organizationId} AND ${organizationApiVersion.apiVersion} < ${input.apiVersion}`,
    );
}
