/**
 * Re-encrypts every webhook endpoint and log drain secret with the first key of `WEBHOOK_SECRETS_KEY` and drops
 * previous secrets that stopped signing, so the other keys can be removed from the list. Idempotent;
 * safe to run while the apps serve traffic. Step 3 of README.md, "Rotating WEBHOOK_SECRETS_KEY".
 *
 *   bun run webhooks:reencrypt [--dry-run]
 *
 * In production, a one-off task of the worker image: `bun apps/worker/scripts/webhooks-reencrypt.ts`.
 * Exits 1 when an endpoint is left that no listed key decrypts, or that changed while it ran.
 */
import { parseArgs } from "node:util";
import { closeDb } from "@coss/db";
import { parseSecretsKeys, reencryptWebhookSecrets } from "@coss/webhooks";

const { values } = parseArgs({ options: { "dry-run": { type: "boolean", default: false } } });
const dryRun = values["dry-run"];

const keys = parseSecretsKeys(process.env.WEBHOOK_SECRETS_KEY ?? "");
console.info(
  `[webhooks] keys: ${keys.keys.map((key, index) => (index === 0 ? `${key.id} (encrypts)` : key.id)).join(", ")}`,
);

try {
  const result = await reencryptWebhookSecrets({ keys, dryRun });
  console.info(
    `[webhooks] ${result.checked} endpoints and log drains checked, ${result.reencrypted} ` +
      `${dryRun ? "to re-encrypt (dry run)" : "re-encrypted"}, ${result.conflicts} changed meanwhile.`,
  );
  for (const row of result.unreadable) {
    console.error(
      `[webhooks] unreadable: ${row.id} (organization ${row.organizationId}): ${row.error}`,
    );
  }
  if (result.unreadable.length > 0 || result.conflicts > 0) {
    console.error(
      "[webhooks] Not done: keep every current key in WEBHOOK_SECRETS_KEY and run this again.",
    );
    process.exitCode = 1;
  } else if (!dryRun) {
    console.info(`[webhooks] Done: only ${keys.primary.id} is needed now.`);
  }
} finally {
  await closeDb();
}
