/**
 * Email for platforms: sub-accounts, one per customer's end user, addressed by id or the
 * customer's own `uid`. Each has its own domains (and SES tenant), suppressions, quotas,
 * reputation and screening sample; the organization stays accountable for all of them.
 */
import type { PlanGate } from "@coss/billing/gate";
import { db, type Executor, schema } from "@coss/db";
import { isId } from "@coss/db/id";
import { and, asc, count, desc, eq, inArray, isNull, lte, ne, or, sql } from "drizzle-orm";
import { isUniqueViolation } from "./domains.ts";
import { SubaccountError } from "./errors.ts";
import {
  DEFAULT_SUBACCOUNT_LIST_LIMIT,
  MAX_SUBACCOUNT_LIST_LIMIT,
  type SubaccountOutput,
} from "./subaccount-schemas.ts";

const { emailSubaccount, environment } = schema;

export type SubaccountRow = typeof emailSubaccount.$inferSelect;

/** Sandbox sub-accounts per environment (live ones are capped by the plan's `subaccounts`). */
export const MAX_SANDBOX_SUBACCOUNTS = 100;

/** How long a deletion claim holds before another worker may take it over. */
const DELETION_LEASE_MS = 10 * 60 * 1000;
const DELETION_MAX_BACKOFF_MS = 60 * 60 * 1000;

/** Quotas as the API names them; `undefined` keeps a value, `null` removes it. */
export type SubaccountQuotasInput = {
  recipients_per_day?: number | null;
  recipients_per_second?: number | null;
  burst?: number | null;
};

export function toSubaccountObject(row: SubaccountRow): SubaccountOutput {
  return {
    object: "subaccount",
    id: row.id,
    uid: row.uid,
    name: row.name,
    metadata: row.metadata,
    status: row.status,
    quotas: {
      recipients_per_day: row.dailyRecipientLimit,
      recipients_per_second: row.perSecondRecipientLimit,
      burst: row.perSecondBurst,
    },
    reputation: {
      status: row.reputationStatus,
      trigger: row.reputationTrigger,
      changed_at: row.reputationChangedAt?.toISOString() ?? null,
      reinstated_at: row.reinstatedAt?.toISOString() ?? null,
    },
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

function uidTaken(uid: string): SubaccountError {
  return new SubaccountError("uid_taken", `Another sub-account already has the uid "${uid}".`, {
    param: "uid",
  });
}

function quotaColumns(quotas: SubaccountQuotasInput | undefined) {
  if (!quotas) return {};
  return {
    ...(quotas.recipients_per_day !== undefined && {
      dailyRecipientLimit: quotas.recipients_per_day,
    }),
    ...(quotas.recipients_per_second !== undefined && {
      perSecondRecipientLimit: quotas.recipients_per_second,
    }),
    ...(quotas.burst !== undefined && { perSecondBurst: quotas.burst }),
  };
}

/** A burst only shapes a per-second quota, and never below it. */
function assertQuotas(row: {
  perSecondRecipientLimit: number | null;
  perSecondBurst: number | null;
}): void {
  if (row.perSecondBurst === null) return;
  if (row.perSecondRecipientLimit === null) {
    throw new SubaccountError(
      "invalid_quotas",
      "A burst needs a per-second quota (`recipients_per_second`).",
      { param: "quotas.burst" },
    );
  }
  if (row.perSecondBurst < row.perSecondRecipientLimit) {
    throw new SubaccountError(
      "invalid_quotas",
      "The burst can't be smaller than the per-second quota.",
      { param: "quotas.burst" },
    );
  }
}

async function environmentOf(organizationId: string, environmentId: string) {
  const [row] = await db
    .select({ projectId: environment.projectId, mode: environment.mode })
    .from(environment)
    .where(and(eq(environment.id, environmentId), eq(environment.organizationId, organizationId)));
  if (!row) throw new Error(`Environment ${environmentId} not found.`);
  return row;
}

/**
 * Creates a sub-account in the environment. Live ones need the plan's `subaccounts` feature and
 * count against its `subaccounts` limit across the organization (deleting ones included, until
 * they are gone); sandbox ones are free, at most `MAX_SANDBOX_SUBACCOUNTS` per environment.
 */
export async function createSubaccount(input: {
  organizationId: string;
  environmentId: string;
  name: string;
  uid?: string | null;
  metadata?: Record<string, string>;
  quotas?: SubaccountQuotasInput;
  plans?: PlanGate;
}): Promise<SubaccountRow> {
  const env = await environmentOf(input.organizationId, input.environmentId);
  if (env.mode === "live") {
    await input.plans?.requireFeature(input.organizationId, "subaccounts");
    if (input.plans) {
      const [existing] = await db
        .select({ value: count() })
        .from(emailSubaccount)
        .innerJoin(
          environment,
          and(
            eq(environment.id, emailSubaccount.environmentId),
            eq(environment.organizationId, emailSubaccount.organizationId),
          ),
        )
        .where(
          and(
            eq(emailSubaccount.organizationId, input.organizationId),
            eq(environment.mode, "live"),
          ),
        );
      await input.plans.requireCapacity(input.organizationId, "subaccounts", existing?.value ?? 0);
    }
  } else {
    const [existing] = await db
      .select({ value: count() })
      .from(emailSubaccount)
      .where(
        and(
          eq(emailSubaccount.organizationId, input.organizationId),
          eq(emailSubaccount.environmentId, input.environmentId),
        ),
      );
    if ((existing?.value ?? 0) >= MAX_SANDBOX_SUBACCOUNTS) {
      throw new SubaccountError(
        "too_many_subaccounts",
        `A sandbox environment can have at most ${MAX_SANDBOX_SUBACCOUNTS} sub-accounts.`,
      );
    }
  }
  const quotas = {
    dailyRecipientLimit: input.quotas?.recipients_per_day ?? null,
    perSecondRecipientLimit: input.quotas?.recipients_per_second ?? null,
    perSecondBurst: input.quotas?.burst ?? null,
  };
  assertQuotas(quotas);
  try {
    const [row] = await db
      .insert(emailSubaccount)
      .values({
        organizationId: input.organizationId,
        projectId: env.projectId,
        environmentId: input.environmentId,
        name: input.name.trim(),
        uid: input.uid ?? null,
        metadata: input.metadata ?? {},
        ...quotas,
      })
      .returning();
    if (!row) throw new Error("Sub-account insert returned no row.");
    return row;
  } catch (error) {
    if (input.uid && isUniqueViolation(error)) throw uidTaken(input.uid);
    throw error;
  }
}

/** The sub-account `ref` (an id, else a uid) names in the environment; `null` when there is none. */
export async function findSubaccount(
  input: { organizationId: string; environmentId: string; ref: string },
  executor: Executor = db,
): Promise<SubaccountRow | null> {
  const [row] = await executor
    .select()
    .from(emailSubaccount)
    .where(
      and(
        eq(emailSubaccount.organizationId, input.organizationId),
        eq(emailSubaccount.environmentId, input.environmentId),
        isId("sub", input.ref)
          ? eq(emailSubaccount.id, input.ref)
          : eq(emailSubaccount.uid, input.ref),
      ),
    )
    .limit(1);
  return row ?? null;
}

/** Like `findSubaccount`, but a missing sub-account is a `subaccount_not_found` error. */
export async function requireSubaccount(
  input: { organizationId: string; environmentId: string; ref: string; param?: string },
  executor: Executor = db,
): Promise<SubaccountRow> {
  const row = await findSubaccount(input, executor);
  if (!row) {
    throw new SubaccountError("subaccount_not_found", "Sub-account not found.", {
      param: input.param,
    });
  }
  return row;
}

/** A sub-account by id, scoped to the organization (the dashboard; worker scans). */
export async function getSubaccount(
  input: { organizationId: string; id: string },
  executor: Executor = db,
): Promise<SubaccountRow | null> {
  const [row] = await executor
    .select()
    .from(emailSubaccount)
    .where(
      and(
        eq(emailSubaccount.organizationId, input.organizationId),
        eq(emailSubaccount.id, input.id),
      ),
    );
  return row ?? null;
}

/** One page of the environment's sub-accounts, newest first. */
export async function pageSubaccounts(input: {
  organizationId: string;
  environmentId: string;
  limit?: number;
  after?: string;
}): Promise<{ subaccounts: SubaccountRow[]; hasMore: boolean }> {
  const limit = Math.min(input.limit ?? DEFAULT_SUBACCOUNT_LIST_LIMIT, MAX_SUBACCOUNT_LIST_LIMIT);
  if (input.after !== undefined && !isId("sub", input.after)) {
    return { subaccounts: [], hasMore: false };
  }
  const scope = and(
    eq(emailSubaccount.organizationId, input.organizationId),
    eq(emailSubaccount.environmentId, input.environmentId),
  );
  // Keyset on (created_at, id), compared in SQL: a JS Date would drop the microseconds.
  const afterCursor =
    input.after === undefined
      ? undefined
      : sql`(${emailSubaccount.createdAt}, ${emailSubaccount.id}) < (select created_at, id from email_subaccount where id = ${input.after} and organization_id = ${input.organizationId})`;
  const rows = await db
    .select()
    .from(emailSubaccount)
    .where(and(scope, afterCursor))
    .orderBy(desc(emailSubaccount.createdAt), desc(emailSubaccount.id))
    .limit(limit + 1);
  return { subaccounts: rows.slice(0, limit), hasMore: rows.length > limit };
}

/** Searches the environment's sub-accounts by uid or name prefix, or an exact id (the dashboard). */
export async function searchSubaccounts(input: {
  organizationId: string;
  environmentId: string;
  query: string;
  limit?: number;
}): Promise<SubaccountRow[]> {
  const pattern = `${input.query.replaceAll(/[\\%_]/g, (c) => `\\${c}`)}%`;
  return db
    .select()
    .from(emailSubaccount)
    .where(
      and(
        eq(emailSubaccount.organizationId, input.organizationId),
        eq(emailSubaccount.environmentId, input.environmentId),
        sql`(${emailSubaccount.uid} ilike ${pattern} or ${emailSubaccount.name} ilike ${pattern} or ${emailSubaccount.id} = ${input.query})`,
      ),
    )
    .orderBy(desc(emailSubaccount.createdAt))
    .limit(Math.min(input.limit ?? DEFAULT_SUBACCOUNT_LIST_LIMIT, MAX_SUBACCOUNT_LIST_LIMIT));
}

/** Changes what the customer controls. A sub-account being deleted can't change any more. */
export async function updateSubaccount(input: {
  organizationId: string;
  id: string;
  name?: string;
  uid?: string | null;
  metadata?: Record<string, string>;
  status?: "active" | "disabled";
  quotas?: SubaccountQuotasInput;
}): Promise<SubaccountRow> {
  try {
    return await db.transaction(async (tx) => {
      const [current] = await tx
        .select()
        .from(emailSubaccount)
        .where(
          and(
            eq(emailSubaccount.organizationId, input.organizationId),
            eq(emailSubaccount.id, input.id),
          ),
        )
        .for("update");
      if (!current) throw new SubaccountError("subaccount_not_found", "Sub-account not found.");
      if (current.status === "deleting") {
        throw new SubaccountError("subaccount_deleting", "The sub-account is being deleted.");
      }
      const changes = {
        ...(input.name !== undefined && { name: input.name.trim() }),
        ...(input.uid !== undefined && { uid: input.uid }),
        ...(input.metadata !== undefined && { metadata: input.metadata }),
        ...(input.status !== undefined && { status: input.status }),
        ...quotaColumns(input.quotas),
      };
      assertQuotas({ ...current, ...changes });
      if (Object.keys(changes).length === 0) return current;
      const [row] = await tx
        .update(emailSubaccount)
        .set(changes)
        .where(eq(emailSubaccount.id, current.id))
        .returning();
      if (!row) throw new SubaccountError("subaccount_not_found", "Sub-account not found.");
      return row;
    });
  } catch (error) {
    if (input.uid && isUniqueViolation(error)) throw uidTaken(input.uid);
    throw error;
  }
}

/**
 * Starts deleting a sub-account: from now on its sends are refused, and the worker
 * (`runDueSubaccountDeletions`) releases what it holds and then deletes the row. Repeating it
 * returns the row as it is.
 */
export async function deleteSubaccount(
  input: { organizationId: string; id: string },
  hooks: { onDeleting?: (tx: Executor, row: SubaccountRow) => Promise<void> } = {},
): Promise<SubaccountRow> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .update(emailSubaccount)
      .set({ status: "deleting", deletionLeaseUntil: null, nextEvaluationAt: null })
      .where(
        and(
          eq(emailSubaccount.organizationId, input.organizationId),
          eq(emailSubaccount.id, input.id),
          ne(emailSubaccount.status, "deleting"),
        ),
      )
      .returning();
    if (row) {
      await hooks.onDeleting?.(tx, row);
      return row;
    }
    const existing = await getSubaccount(input, tx);
    if (!existing) throw new SubaccountError("subaccount_not_found", "Sub-account not found.");
    return existing;
  });
}

export type SubaccountDeletionDeps = {
  /**
   * Releases what the sub-account holds outside its row's cascade (domains and their provider
   * identities, its SES tenant). Must be idempotent: a claim can be retried after a crash.
   */
  release: (row: SubaccountRow) => Promise<void>;
};

/**
 * The worker's scan: claims sub-accounts being deleted (a lease, backing off 1 → 60 min on
 * failures, never giving up), releases what they hold and deletes the rows (which cascades their
 * suppressions and counters; their emails keep the id, like a deleted API key's). System-level.
 */
export async function runDueSubaccountDeletions(
  deps: SubaccountDeletionDeps,
  opts: { now?: Date; limit?: number; scope?: { organizationIds: string[] } } = {},
): Promise<number> {
  const now = opts.now ?? new Date();
  const claimable = and(
    eq(emailSubaccount.status, "deleting"),
    or(isNull(emailSubaccount.deletionLeaseUntil), lte(emailSubaccount.deletionLeaseUntil, now)),
    opts.scope ? inArray(emailSubaccount.organizationId, opts.scope.organizationIds) : undefined,
  );
  const due = await db
    .select({ id: emailSubaccount.id })
    .from(emailSubaccount)
    .where(claimable)
    .orderBy(asc(emailSubaccount.deletionLeaseUntil))
    .limit(opts.limit ?? 20);
  let deleted = 0;
  for (const candidate of due) {
    const [claimed] = await db
      .update(emailSubaccount)
      .set({
        deletionLeaseUntil: new Date(now.getTime() + DELETION_LEASE_MS),
        deletionAttempts: sql`${emailSubaccount.deletionAttempts} + 1`,
      })
      .where(and(claimable, eq(emailSubaccount.id, candidate.id)))
      .returning();
    if (!claimed) continue;
    try {
      await deps.release(claimed);
      // Fenced on the attempt count: a worker whose claim was taken over deletes nothing.
      const removed = await db
        .delete(emailSubaccount)
        .where(
          and(
            eq(emailSubaccount.id, claimed.id),
            eq(emailSubaccount.status, "deleting"),
            eq(emailSubaccount.deletionAttempts, claimed.deletionAttempts),
          ),
        )
        .returning({ id: emailSubaccount.id });
      if (removed.length > 0) deleted++;
    } catch (error) {
      console.error(`[subaccounts] deleting ${claimed.id} failed:`, error);
      const backoff = Math.min(
        60_000 * 2 ** Math.max(0, claimed.deletionAttempts - 1),
        DELETION_MAX_BACKOFF_MS,
      );
      await db
        .update(emailSubaccount)
        .set({ deletionLeaseUntil: new Date(now.getTime() + backoff) })
        .where(
          and(
            eq(emailSubaccount.id, claimed.id),
            eq(emailSubaccount.deletionAttempts, claimed.deletionAttempts),
          ),
        );
    }
  }
  return deleted;
}
