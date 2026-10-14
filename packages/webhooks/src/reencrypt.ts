/**
 * Re-encrypts stored endpoint secrets with the newest `WEBHOOK_SECRETS_KEY`, the step that lets an
 * old key leave the list (README.md, "Rotating WEBHOOK_SECRETS_KEY"). System-level: the scan spans
 * organizations, and every write is scoped by the row's own id and organization.
 */
import { db, schema } from "@coss/db";
import { and, asc, eq, gt, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import {
  decryptSecret,
  encryptSecret,
  isEncryptedWithPrimary,
  type SecretsKeyRing,
} from "./secrets.ts";

const { logDrain, riskSettings, webhookEndpoint } = schema;

export type ReencryptResult = {
  /** Endpoints and log drains looked at. */
  checked: number;
  /** Endpoints and log drains rewritten (with `dryRun`: that would be). */
  reencrypted: number;
  /** Rows with a secret no listed key decrypts: nothing can be delivered to them until it is back. */
  unreadable: { id: string; organizationId: string; error: string }[];
  /** Rows whose secret changed while this ran (left as they are); run again to cover them. */
  conflicts: number;
};

/**
 * Rewrites every endpoint and log drain secret not encrypted with the key ring's primary key, and
 * drops previous endpoint secrets that stopped signing. Idempotent and safe while the apps serve traffic: a row is only
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
  await reencryptLogDrainSecrets({ ...opts, batchSize }, result);
  await reencryptCaptchaSecrets({ ...opts, batchSize }, result);
  return result;
}

/** Risk settings' captcha secrets (encrypted with the same key ring, `@coss/risk`). */
async function reencryptCaptchaSecrets(
  opts: {
    keys: SecretsKeyRing;
    dryRun?: boolean;
    batchSize: number;
    scope?: { organizationIds: string[] };
  },
  result: ReencryptResult,
): Promise<void> {
  const { keys } = opts;
  let after = "";
  for (;;) {
    const rows = await db
      .select({
        id: riskSettings.environmentId,
        organizationId: riskSettings.organizationId,
        secretCiphertext: riskSettings.captchaSecretCiphertext,
      })
      .from(riskSettings)
      .where(
        and(
          gt(riskSettings.environmentId, after),
          isNotNull(riskSettings.captchaSecretCiphertext),
          opts.scope ? inArray(riskSettings.organizationId, opts.scope.organizationIds) : undefined,
        ),
      )
      .orderBy(asc(riskSettings.environmentId))
      .limit(opts.batchSize);
    for (const row of rows) {
      const stored = row.secretCiphertext;
      if (!stored) continue;
      result.checked++;
      if (isEncryptedWithPrimary(stored, keys)) continue;
      let secretCiphertext: string;
      try {
        secretCiphertext = encryptSecret(decryptSecret(stored, keys), keys);
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
        .update(riskSettings)
        .set({
          captchaSecretCiphertext: secretCiphertext,
          updatedAt: sql`${riskSettings.updatedAt}`,
        })
        .where(
          and(
            eq(riskSettings.environmentId, row.id),
            eq(riskSettings.organizationId, row.organizationId),
            eq(riskSettings.captchaSecretCiphertext, stored),
          ),
        )
        .returning({ id: riskSettings.environmentId });
      if (updated) result.reencrypted++;
      else result.conflicts++;
    }
    const last = rows.at(-1);
    if (!last || rows.length < opts.batchSize) break;
    after = last.id;
  }
}

/** Log drains have one secret each (no rolls). */
async function reencryptLogDrainSecrets(
  opts: {
    keys: SecretsKeyRing;
    dryRun?: boolean;
    batchSize: number;
    scope?: { organizationIds: string[] };
  },
  result: ReencryptResult,
): Promise<void> {
  const { keys } = opts;
  let after = "";
  for (;;) {
    const rows = await db
      .select({
        id: logDrain.id,
        organizationId: logDrain.organizationId,
        secretCiphertext: logDrain.secretCiphertext,
      })
      .from(logDrain)
      .where(
        and(
          gt(logDrain.id, after),
          opts.scope ? inArray(logDrain.organizationId, opts.scope.organizationIds) : undefined,
        ),
      )
      .orderBy(asc(logDrain.id))
      .limit(opts.batchSize);
    for (const row of rows) {
      result.checked++;
      if (isEncryptedWithPrimary(row.secretCiphertext, keys)) continue;
      let secretCiphertext: string;
      try {
        secretCiphertext = encryptSecret(decryptSecret(row.secretCiphertext, keys), keys);
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
        .update(logDrain)
        .set({ secretCiphertext, updatedAt: sql`${logDrain.updatedAt}` })
        .where(
          and(
            eq(logDrain.id, row.id),
            eq(logDrain.organizationId, row.organizationId),
            eq(logDrain.secretCiphertext, row.secretCiphertext),
          ),
        )
        .returning({ id: logDrain.id });
      if (updated) result.reencrypted++;
      else result.conflicts++;
    }
    const last = rows.at(-1);
    if (!last || rows.length < opts.batchSize) break;
    after = last.id;
  }
}
