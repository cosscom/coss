/**
 * The worker's `migrations` loop (system-level: it reads every organization's due imports). Each
 * run claims a due import with a lease (`lease_until`, bound from a JS `Date`; every write is
 * fenced on it, so a worker whose lease was taken over writes nothing), then works on it for a
 * step (`MIGRATION_STEP_MS`): an `inspecting` one reads the provider's inventory, a queued or
 * running one goes through its phases from the saved cursor. Imports take turns: a step that
 * runs out of time saves its cursor and comes back on the next run. Suspended and deleting
 * organizations' imports are held.
 */
import { db, type Executor, schema } from "@coss/db";
import { recordOrgAuditEvent } from "@coss/logs";
import { decryptSecret, type SecretsKeyRing } from "@coss/webhooks";
import { leaseUntil, organizationNotHeld } from "@coss/webhooks/engine";
import { and, asc, eq, inArray, isNull, lt, lte, or, sql } from "drizzle-orm";
import { ProviderError } from "./http.ts";
import {
  emptyProgress,
  type MigrationProgress,
  type MigrationRow,
  phasesFor,
  progressOf,
  selectionOf,
} from "./migrations.ts";
import { PHASES, type PhaseDeps, type PhaseResult, PhaseStopped } from "./phases.ts";
import { createSource, type SourceDeps } from "./sources/index.ts";
import {
  type MigrationPhase,
  type MigrationSource,
  PROVIDER_NAMES,
  type SourceConfig,
  type SourceOptions,
} from "./types.ts";

const { migration } = schema;

export const MIGRATION_LEASE_MS = 5 * 60 * 1000;
/** How long one run works on an import before it saves its cursor and lets others go. */
export const MIGRATION_STEP_MS = 20 * 1000;
const RETRY_DELAY_MS = 60 * 1000;
/** Failed runs in a row before the import gives up. */
const MAX_ATTEMPTS = 8;

export type MigrationWorkerDeps = PhaseDeps & {
  secretsKeys: SecretsKeyRing;
  sourceDeps?: SourceDeps | undefined;
  /** Replaces the provider (tests). */
  createSource?: ((config: SourceConfig) => MigrationSource) | undefined;
};

const ACTIVE = ["inspecting", "queued", "running"] as const;

/**
 * Advances every due import by one step. Returns how many it advanced. `scope` limits the scan to
 * some organizations (tests); `clock` is the step's time source (tests), `now` the claim time.
 */
export async function runDueMigrations(
  deps: MigrationWorkerDeps,
  opts: {
    now?: Date;
    limit?: number;
    scope?: { organizationIds: string[] };
    stepMs?: number;
    clock?: () => number;
  } = {},
): Promise<number> {
  const now = opts.now ?? new Date();
  const clock = opts.clock ?? Date.now;
  const claimable = and(
    inArray(migration.status, [...ACTIVE]),
    lte(migration.nextRunAt, now),
    or(isNull(migration.leaseUntil), lt(migration.leaseUntil, now)),
    organizationNotHeld(migration.organizationId),
  );
  const due = await db
    .select({ id: migration.id })
    .from(migration)
    .where(
      and(
        claimable,
        opts.scope ? inArray(migration.organizationId, opts.scope.organizationIds) : undefined,
      ),
    )
    .orderBy(asc(migration.nextRunAt))
    .limit(opts.limit ?? 5);
  let advanced = 0;
  for (const { id } of due) {
    const lease = leaseUntil(now, MIGRATION_LEASE_MS);
    const [claimed] = await db
      .update(migration)
      .set({ leaseUntil: lease, attemptCount: sql`${migration.attemptCount} + 1` })
      .where(and(claimable, eq(migration.id, id)))
      .returning();
    if (!claimed) continue;
    const deadline = clock() + (opts.stepMs ?? MIGRATION_STEP_MS);
    try {
      await step(claimed, lease, deps, { deadline, clock });
      advanced++;
    } catch (error) {
      await stepFailed(claimed, lease, error, clock());
    }
  }
  return advanced;
}

/** Writes `values` and releases the lease, only while this worker still holds it. */
async function save(
  executor: Executor,
  row: MigrationRow,
  lease: Date,
  values: Partial<typeof migration.$inferInsert>,
): Promise<MigrationRow | null> {
  const [updated] = await executor
    .update(migration)
    .set({ ...values, leaseUntil: null })
    .where(and(eq(migration.id, row.id), eq(migration.leaseUntil, lease)))
    .returning();
  return updated ?? null;
}

function sourceFor(row: MigrationRow, deps: MigrationWorkerDeps): MigrationSource {
  if (!row.credentialsCiphertext) throw new ProviderError("unauthorized", "The API key is gone.");
  const config: SourceConfig = {
    provider: row.provider,
    apiKey: decryptSecret(row.credentialsCiphertext, deps.secretsKeys),
    options: row.source as SourceOptions,
  };
  return deps.createSource ? deps.createSource(config) : createSource(config, deps.sourceDeps);
}

async function step(
  row: MigrationRow,
  lease: Date,
  deps: MigrationWorkerDeps,
  time: { deadline: number; clock: () => number },
): Promise<void> {
  const source = sourceFor(row, deps);
  if (row.status === "inspecting") {
    const inventory = await source.inventory(time.deadline);
    await save(db, row, lease, {
      status: "ready",
      inventory,
      nextRunAt: null,
      attemptCount: 0,
      lastError: null,
    });
    return;
  }
  const selection = selectionOf(row);
  if (!selection) throw new Error(`Migration ${row.id} has no selection.`);
  const phases = phasesFor(selection.kinds);
  const progress: MigrationProgress = progressOf(row);
  const startedAt = row.startedAt ?? new Date(time.clock());
  let phase: MigrationPhase | null =
    row.status === "queued" ? (phases[0] ?? null) : (row.phase as MigrationPhase | null);
  let cursor: unknown = row.status === "queued" ? null : row.cursor;
  const env = { organizationId: row.organizationId, environmentId: row.environmentId };

  while (phase) {
    const current = progress[phase] ?? emptyProgress();
    progress[phase] = current;
    current.state = "running";
    let result: PhaseResult;
    try {
      result = await PHASES[phase](
        {
          row,
          env,
          source,
          selection,
          progress: current,
          deps,
          deadline: time.deadline,
          now: time.clock,
        },
        cursor,
      );
    } catch (error) {
      // What this phase can't do (a permission the key lacks, a plan limit) doesn't stop the rest.
      if (
        error instanceof PhaseStopped ||
        (error instanceof ProviderError &&
          ["forbidden", "not_found", "bad_request"].includes(error.code))
      ) {
        current.state = "failed";
        current.message = error.message;
        result = { next: null };
      } else {
        // Keep the counts made so far; the caller retries from the saved cursor.
        await db
          .update(migration)
          .set({ progress })
          .where(and(eq(migration.id, row.id), eq(migration.leaseUntil, lease)));
        throw error;
      }
    }
    if (result.next !== null) {
      await save(db, row, lease, {
        status: "running",
        phase,
        cursor: result.next,
        progress,
        startedAt,
        nextRunAt: result.retryAt ?? new Date(time.clock()),
        attemptCount: 0,
        lastError: null,
      });
      return;
    }
    if (current.state === "running") current.state = "done";
    phase = phases[phases.indexOf(phase) + 1] ?? null;
    cursor = null;
    if (phase && time.clock() >= time.deadline) {
      await save(db, row, lease, {
        status: "running",
        phase,
        cursor: null,
        progress,
        startedAt,
        nextRunAt: new Date(time.clock()),
        attemptCount: 0,
        lastError: null,
      });
      return;
    }
  }
  await finish(row, lease, "completed", { progress, startedAt, lastError: null }, time.clock());
}

/** Ends the import (the key is deleted with it) and records it in the audit log. */
async function finish(
  row: MigrationRow,
  lease: Date,
  status: "completed" | "failed",
  values: Partial<typeof migration.$inferInsert>,
  at: number,
): Promise<void> {
  await db.transaction(async (tx) => {
    const finished = await save(tx, row, lease, {
      ...values,
      status,
      credentialsCiphertext: null,
      phase: null,
      cursor: null,
      nextRunAt: null,
      finishedAt: new Date(at),
    });
    if (!finished) return;
    await recordOrgAuditEvent(
      {
        organizationId: row.organizationId,
        projectId: row.projectId,
        environmentId: row.environmentId,
        actor: { type: "system", id: null, label: "coss.com" },
        action: status === "completed" ? "migration.completed" : "migration.failed",
        target: { type: "migration", id: row.id, label: PROVIDER_NAMES[row.provider] },
        metadata: {
          provider: row.provider,
          ...(finished.lastError ? { error: finished.lastError } : {}),
          phases: Object.fromEntries(
            Object.entries(progressOf(finished)).map(([phase, p]) => [
              phase,
              { state: p?.state, created: p?.created, updated: p?.updated, invalid: p?.invalid },
            ]),
          ),
        },
      },
      tx,
    );
  });
}

async function stepFailed(
  row: MigrationRow,
  lease: Date,
  error: unknown,
  at: number,
): Promise<void> {
  const name = PROVIDER_NAMES[row.provider];
  if (error instanceof ProviderError && error.code === "rate_limited") {
    await save(db, row, lease, {
      nextRunAt: error.retryAt ?? new Date(at + RETRY_DELAY_MS),
      attemptCount: Math.max(0, row.attemptCount - 1),
    });
    return;
  }
  if (error instanceof ProviderError && error.code === "unauthorized") {
    await finish(
      row,
      lease,
      "failed",
      {
        lastError: `${name} no longer accepts the API key (was it revoked?). Start a new import with a new key.`,
      },
      at,
    );
    return;
  }
  const message =
    error instanceof ProviderError ? error.message : "Something went wrong on our side.";
  if (!(error instanceof ProviderError)) {
    console.error(`[migrate] ${row.id} failed a step:`, error);
  }
  if (row.attemptCount >= MAX_ATTEMPTS) {
    await finish(row, lease, "failed", { lastError: message }, at);
    return;
  }
  await save(db, row, lease, {
    lastError: message,
    nextRunAt: new Date(at + RETRY_DELAY_MS * row.attemptCount),
  });
}
