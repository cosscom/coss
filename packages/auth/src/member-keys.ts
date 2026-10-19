/**
 * A personal API key belongs to its owner's membership: `authenticateApiKey` refuses it as soon as
 * the owner is no longer a member (authoritative, every path), and coss.com deletes it when they
 * leave, are removed or are deprovisioned by the directory, so it doesn't linger in the key lists.
 */
import { db, schema } from "@coss/db";
import { and, eq, inArray, isNotNull, notExists } from "drizzle-orm";
import { recordOrgAudit } from "./audit.ts";

const { apikey, environment, environmentApiKey, member } = schema;

/**
 * Deletes the organization's personal keys whose owner is no longer a member, and records each
 * in the audit log. Returns how many were deleted.
 */
export async function revokeDepartedMemberKeys(organizationId: string): Promise<number> {
  const departed = db
    .select({ id: environmentApiKey.apiKeyId })
    .from(environmentApiKey)
    .innerJoin(environment, eq(environment.id, environmentApiKey.environmentId))
    .where(
      and(
        eq(environment.organizationId, organizationId),
        isNotNull(environmentApiKey.ownerUserId),
        notExists(
          db
            .select({ id: member.id })
            .from(member)
            .where(
              and(
                eq(member.organizationId, organizationId),
                eq(member.userId, environmentApiKey.ownerUserId),
              ),
            ),
        ),
      ),
    );
  const deleted = await db
    .delete(apikey)
    .where(and(eq(apikey.referenceId, organizationId), inArray(apikey.id, departed)))
    .returning({ id: apikey.id, name: apikey.name });
  for (const key of deleted) {
    await recordOrgAudit({
      organizationId,
      actor: { type: "system", id: null, label: "coss.com" },
      action: "api_key.revoked",
      target: { type: "api_key", id: key.id, label: key.name },
      metadata: { reason: "owner_left" },
    });
  }
  return deleted.length;
}
