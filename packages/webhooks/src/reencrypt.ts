/**
 * Re-encrypts stored endpoint secrets with the newest `WEBHOOK_SECRETS_KEY`, the step that lets an
 * old key leave the list (README.md, "Rotating WEBHOOK_SECRETS_KEY"). System-level: the scan spans
 * organizations, and every write is scoped by the row's own id and organization.
 */
import { db, schema } from "@coss/db";
import { and, asc, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import {
  decryptSecret,
  encryptSecret,
  isEncryptedWithPrimary,
  type SecretsKeyRing,
} from "./secrets.ts";

const { webhookEndpoint } = schema;

export type ReencryptResult = {
  /** Endpoints looked at. */
  checked: number;
  /** Endpoints rewritten (with `dryRun`: that would be). */
  reencrypted: number;
  /** Endpoints with a secret no listed key decrypts: nothing can be delivered to them until it is back. */
  unreadable: { id: string; organizationId: string; error: string }[];
  /** Endpoints whose secret was rolled while this ran (left as they are); run again to cover them. */
  conflicts: number;
};

/**
 * Rewrites every endpoint secret not encrypted with the key ring's primary key, and drops previous
 * secrets that stopped signing. Idempotent and safe while the apps serve traffic: a row is only
 * updated if it still holds what was read. `scope` limits the scan to some organizations (tests).
 */
export async function reencryptWebhookSecrets(opts: {
  keys: SecretsKeyRing;
  dryRun?: boolean;
  batchSize?: number;
  now?: Date;
  scope?: { organizationIds: string[] };
}): Promise<ReencryptResult> {
  const { keys } = opts;
  const now = opts.now ?? new Date();
  const batchSize = opts.batchSize ?? 200;
  const result: ReencryptResult = { checked: 0, reencrypted: 0, unreadable: [], conflicts: 0 };
  const reencrypt = (stored: string) =>
    isEncryptedWithPrimary(stored, keys)
      ? stored
      : encryptSecret(decryptSecret(stored, keys), keys);
  let after = "";
  for (;;) {
    const rows = await db
      .select({
        id: webhookEndpoint.id,
        organizationId: webhookEndpoint.organizationId,
        secretCiphertext: webhookEndpoint.secretCiphertext,
        previousSecretCiphertext: webhookEndpoint.previousSecretCiphertext,
        previousSecretExpiresAt: webhookEndpoint.previousSecretExpiresAt,
      })
      .from(webhookEndpoint)
      .where(
        and(
          gt(webhookEndpoint.id, after),
          opts.scope
            ? inArray(webhookEndpoint.organizationId, opts.scope.organizationIds)
            : undefined,
        ),
      )
      .orderBy(asc(webhookEndpoint.id))
      .limit(batchSize);
    for (const row of rows) {
      result.checked++;
      const dropPrevious =
        row.previousSecretCiphertext !== null &&
        (row.previousSecretExpiresAt === null || row.previousSecretExpiresAt <= now);
      const previous = dropPrevious ? null : row.previousSecretCiphertext;
      const stale = [row.secretCiphertext, previous].some(
        (stored) => stored !== null && !isEncryptedWithPrimary(stored, keys),
      );
      if (!stale && !dropPrevious) continue;
      let next: { secretCiphertext: string; previousSecretCiphertext: string | null };
      try {
        next = {
          secretCiphertext: reencrypt(row.secretCiphertext),
          previousSecretCiphertext: previous === null ? null : reencrypt(previous),
        };
      } catch (error) {
        result.unreadable.push({
          id: row.id,
          organizationId: row.organizationId,
          error: error instanceof Error ? error.message : String(error),
        });
        continue;
      }
      if (opts.dryRun) {
        result.reencrypted++;
        continue;
      }
      const [updated] = await db
        .update(webhookEndpoint)
        .set({
          ...next,
          previousSecretExpiresAt: previous === null ? null : row.previousSecretExpiresAt,
          // The customer changed nothing.
          updatedAt: sql`${webhookEndpoint.updatedAt}`,
        })
        .where(
          and(
            eq(webhookEndpoint.id, row.id),
            eq(webhookEndpoint.organizationId, row.organizationId),
            eq(webhookEndpoint.secretCiphertext, row.secretCiphertext),
            row.previousSecretCiphertext === null
              ? isNull(webhookEndpoint.previousSecretCiphertext)
              : eq(webhookEndpoint.previousSecretCiphertext, row.previousSecretCiphertext),
          ),
        )
        .returning({ id: webhookEndpoint.id });
      if (updated) result.reencrypted++;
      else result.conflicts++;
    }
    const last = rows.at(-1);
    if (!last || rows.length < batchSize) break;
    after = last.id;
  }
  return result;
}
