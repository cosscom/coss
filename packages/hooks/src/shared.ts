import { db, schema } from "@coss/db";
import { type SecretsKeyRing, validateWebhookUrl, WebhookUrlError } from "@coss/webhooks";
import { and, eq } from "drizzle-orm";
import { HookError } from "./errors.ts";
import { DESCRIPTION_MAX_LENGTH } from "./schemas.ts";

const { environment } = schema;

export type HookManagementDeps = {
  /** From `WEBHOOK_SECRETS_KEY` (`parseSecretsKeys`): endpoint secrets share the webhook key ring. */
  secretsKeys: SecretsKeyRing;
  /** Accept `http:` and private hosts (local development only). */
  allowInsecureUrls: boolean;
};

/** An environment of the organization: its project and whether it is live or sandbox. */
export async function environmentOf(organizationId: string, environmentId: string) {
  const [row] = await db
    .select({ projectId: environment.projectId, mode: environment.mode })
    .from(environment)
    .where(and(eq(environment.organizationId, organizationId), eq(environment.id, environmentId)))
    .limit(1);
  if (!row) throw new HookError("not_found", "Environment not found.");
  return row;
}

export function normalizeDescription(value: string | null | undefined): string | null {
  return value?.trim().slice(0, DESCRIPTION_MAX_LENGTH) || null;
}

export function checkedUrl(value: string, deps: Pick<HookManagementDeps, "allowInsecureUrls">) {
  try {
    return validateWebhookUrl(value.trim(), { allowInsecure: deps.allowInsecureUrls }).href;
  } catch (error) {
    if (error instanceof WebhookUrlError) throw new HookError("invalid_url", error.message, "url");
    throw error;
  }
}

/** Postgres' unique violation, optionally of one constraint. */
export function isUniqueViolation(error: unknown, constraint?: string): boolean {
  const cause = (error as { cause?: unknown })?.cause ?? error;
  const pg = cause as { code?: string; constraint?: string };
  return pg?.code === "23505" && (constraint === undefined || pg.constraint === constraint);
}
