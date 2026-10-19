/**
 * An environment's SMS suppression list (`sms_suppression`, ids `smssup_`): sends to a listed
 * number are skipped (`sms.suppressed`). Opt-outs (STOP) are added to every live environment of
 * the organization, since its numbers are shared by them; provider failures that say the number is
 * invalid or opted out add it to the sending environment's.
 */
import { db, type Executor, schema } from "@coss/db";
import { isId } from "@coss/db/id";
import { and, desc, eq, sql } from "drizzle-orm";
import { SmsError } from "./errors.ts";
import { isSimulatorNumber, parsePhoneNumber } from "./phone.ts";
import {
  DEFAULT_SMS_LIST_LIMIT,
  MAX_SMS_LIST_LIMIT,
  type SmsSuppressionCheckOutput,
  type SmsSuppressionOutput,
  type SmsSuppressionReason,
} from "./schemas.ts";

const { environment, smsSuppression } = schema;

export type SmsSuppressionRow = typeof smsSuppression.$inferSelect;

type Environment = { organizationId: string; projectId: string; environmentId: string };

export function toSmsSuppressionObject(row: SmsSuppressionRow): SmsSuppressionOutput {
  return {
    object: "sms_suppression",
    id: row.id,
    phone_number: row.phoneNumber,
    reason: row.reason,
    sms_id: row.messageId,
    created_at: row.createdAt.toISOString(),
  };
}

/** The environment's entry for a number, if any. */
export async function suppressedNumber(
  executor: Executor,
  env: { organizationId: string; environmentId: string },
  phoneNumber: string,
): Promise<SmsSuppressionRow | null> {
  const [row] = await executor
    .select()
    .from(smsSuppression)
    .where(
      and(
        eq(smsSuppression.organizationId, env.organizationId),
        eq(smsSuppression.environmentId, env.environmentId),
        eq(smsSuppression.phoneNumber, phoneNumber),
      ),
    )
    .limit(1);
  return row ?? null;
}

/**
 * Adds a number a provider failure says can't (or mustn't) get messages. Never the simulator's
 * numbers: tests would then see `sms.suppressed` instead of the outcome they simulate.
 */
export async function autoSuppressSms(
  tx: Executor,
  input: Environment & { phoneNumber: string; reason: SmsSuppressionReason; messageId: string },
): Promise<void> {
  if (isSimulatorNumber(input.phoneNumber)) return;
  await tx
    .insert(smsSuppression)
    .values({
      organizationId: input.organizationId,
      projectId: input.projectId,
      environmentId: input.environmentId,
      phoneNumber: input.phoneNumber,
      reason: input.reason,
      messageId: input.messageId,
    })
    .onConflictDoNothing({ target: [smsSuppression.environmentId, smsSuppression.phoneNumber] });
}

/**
 * A STOP from `phoneNumber`: an `opt_out` entry in every live environment of the organization.
 * Returns the entries that are new (their environments get `sms.opted_out`).
 */
export async function optOutEverywhere(
  tx: Executor,
  input: { organizationId: string; phoneNumber: string },
): Promise<SmsSuppressionRow[]> {
  const environments = await tx
    .select({ id: environment.id, projectId: environment.projectId })
    .from(environment)
    .where(and(eq(environment.organizationId, input.organizationId), eq(environment.mode, "live")));
  if (environments.length === 0) return [];
  return tx
    .insert(smsSuppression)
    .values(
      environments.map((env) => ({
        organizationId: input.organizationId,
        projectId: env.projectId,
        environmentId: env.id,
        phoneNumber: input.phoneNumber,
        reason: "opt_out" as const,
      })),
    )
    .onConflictDoNothing({ target: [smsSuppression.environmentId, smsSuppression.phoneNumber] })
    .returning();
}

/**
 * A START from `phoneNumber`: its `opt_out` entries go (entries added for another reason stay).
 * Returns the entries removed (their environments get `sms.opted_in`).
 */
export async function optInEverywhere(
  tx: Executor,
  input: { organizationId: string; phoneNumber: string },
): Promise<SmsSuppressionRow[]> {
  return tx
    .delete(smsSuppression)
    .where(
      and(
        eq(smsSuppression.organizationId, input.organizationId),
        eq(smsSuppression.phoneNumber, input.phoneNumber),
        eq(smsSuppression.reason, "opt_out"),
      ),
    )
    .returning();
}

function validNumber(value: string): string {
  const parsed = parsePhoneNumber(value);
  if (!parsed) {
    throw new SmsError("invalid_phone_number", `${value} isn't a valid phone number.`, {
      param: "phone_number",
    });
  }
  return parsed.phoneNumber;
}

/** Adds a number by hand (`manual`); an existing entry is returned as it is. */
export async function addSmsSuppression(
  env: Environment,
  phoneNumber: string,
): Promise<{ suppression: SmsSuppressionOutput; created: boolean }> {
  const number = validNumber(phoneNumber);
  const [inserted] = await db
    .insert(smsSuppression)
    .values({ ...env, phoneNumber: number, reason: "manual" })
    .onConflictDoNothing({ target: [smsSuppression.environmentId, smsSuppression.phoneNumber] })
    .returning();
  if (inserted) return { suppression: toSmsSuppressionObject(inserted), created: true };
  const existing = await suppressedNumber(db, env, number);
  if (!existing) throw new Error("SMS suppression vanished after a conflict.");
  return { suppression: toSmsSuppressionObject(existing), created: false };
}

export async function listSmsSuppressions(input: {
  organizationId: string;
  environmentId: string;
  phoneNumber?: string;
  limit?: number;
  after?: string;
}): Promise<{ data: SmsSuppressionOutput[]; hasMore: boolean }> {
  const limit = Math.min(input.limit ?? DEFAULT_SMS_LIST_LIMIT, MAX_SMS_LIST_LIMIT);
  const rows = await db
    .select()
    .from(smsSuppression)
    .where(
      and(
        eq(smsSuppression.organizationId, input.organizationId),
        eq(smsSuppression.environmentId, input.environmentId),
        input.phoneNumber ? eq(smsSuppression.phoneNumber, input.phoneNumber) : undefined,
        input.after
          ? sql`(${smsSuppression.createdAt}, ${smsSuppression.sequence}) < (
              select c.created_at, c.sequence from ${smsSuppression} c
              where c.id = ${input.after}
                and c.organization_id = ${input.organizationId}
                and c.environment_id = ${input.environmentId}
            )`
          : undefined,
      ),
    )
    .orderBy(desc(smsSuppression.createdAt), desc(smsSuppression.sequence))
    .limit(limit + 1);
  return {
    data: rows.slice(0, limit).map(toSmsSuppressionObject),
    hasMore: rows.length > limit,
  };
}

async function environmentSuppression(input: {
  organizationId: string;
  environmentId: string;
  id: string;
}): Promise<SmsSuppressionRow> {
  const [row] = isId("smssup", input.id)
    ? await db
        .select()
        .from(smsSuppression)
        .where(
          and(
            eq(smsSuppression.organizationId, input.organizationId),
            eq(smsSuppression.environmentId, input.environmentId),
            eq(smsSuppression.id, input.id),
          ),
        )
        .limit(1)
    : [];
  if (!row) throw new SmsError("not_found", "SMS suppression not found.");
  return row;
}

export async function getSmsSuppression(input: {
  organizationId: string;
  environmentId: string;
  id: string;
}): Promise<SmsSuppressionOutput> {
  return toSmsSuppressionObject(await environmentSuppression(input));
}

/** Removes an entry: sends to the number go out again. */
export async function removeSmsSuppression(input: {
  organizationId: string;
  environmentId: string;
  id: string;
}): Promise<SmsSuppressionOutput> {
  const row = await environmentSuppression(input);
  await db
    .delete(smsSuppression)
    .where(
      and(eq(smsSuppression.id, row.id), eq(smsSuppression.organizationId, row.organizationId)),
    );
  return toSmsSuppressionObject(row);
}

export async function checkSmsSuppression(input: {
  organizationId: string;
  environmentId: string;
  phoneNumber: string;
}): Promise<SmsSuppressionCheckOutput> {
  const row = await suppressedNumber(db, input, input.phoneNumber);
  return {
    object: "sms_suppression_check",
    phone_number: input.phoneNumber,
    suppressed: row !== null,
    suppression: row ? toSmsSuppressionObject(row) : null,
  };
}
