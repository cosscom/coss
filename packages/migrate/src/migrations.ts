/**
 * Imports from another provider, as the dashboard drives them: connect (the key is checked and
 * stored encrypted; the worker reads what there is), start (the customer's choice), cancel, reads.
 * Every function is scoped by organization and environment (the tenancy rule).
 */
import { db, schema } from "@coss/db";
import { isId } from "@coss/db/id";
import { encryptSecret, type SecretsKeyRing } from "@coss/webhooks";
import { and, asc, desc, eq, inArray, isNotNull } from "drizzle-orm";
import {
  type Inventory,
  MIGRATION_PHASES,
  type MigrationKind,
  type MigrationPhase,
  type MigrationProvider,
  type SourceOptions,
} from "./types.ts";

const { migration, migrationItem, environment } = schema;

export type MigrationRow = typeof migration.$inferSelect;
export type MigrationItemRow = typeof migrationItem.$inferSelect;
export type MigrationEnvironment = { organizationId: string; environmentId: string };

export type MigrationSelection = {
  kinds: MigrationKind[];
  /** Source ids of the domains chosen (created by the dashboard when the import starts). */
  domainIds: string[];
  /** The API version imported webhook endpoints get (the organization's). */
  webhookApiVersion: string;
};

export type PhaseProgress = {
  state: "pending" | "running" | "done" | "failed";
  created: number;
  updated: number;
  existing: number;
  skipped: number;
  invalid: number;
  /** Why the phase failed, or what it left out. */
  message?: string | undefined;
  /** The first invalid entries (an address and why). */
  samples: { value: string; message: string }[];
};

export type MigrationProgress = Partial<Record<MigrationPhase, PhaseProgress>>;

export const MAX_PROGRESS_SAMPLES = 20;

/** Statuses the worker still works on (and a customer can cancel). */
export const ACTIVE_MIGRATION_STATUSES = ["inspecting", "ready", "queued", "running"] as const;

export function emptyProgress(): PhaseProgress {
  return {
    state: "pending",
    created: 0,
    updated: 0,
    existing: 0,
    skipped: 0,
    invalid: 0,
    samples: [],
  };
}

/** The worker's phases for a selection, in order. */
export function phasesFor(kinds: readonly MigrationKind[]): MigrationPhase[] {
  const wanted = new Set<MigrationPhase>();
  if (kinds.includes("contacts")) {
    for (const phase of ["properties", "topics", "audiences", "contacts", "memberships"] as const) {
      wanted.add(phase);
    }
  }
  // Unsubscribe groups' members are opted out of their topic.
  if (kinds.includes("suppressions")) {
    wanted.add("topics");
    wanted.add("suppressions");
  }
  if (kinds.includes("templates")) wanted.add("templates");
  if (kinds.includes("webhooks")) wanted.add("webhooks");
  return MIGRATION_PHASES.filter((phase) => wanted.has(phase));
}

function inEnvironment(env: MigrationEnvironment) {
  return and(
    eq(migration.organizationId, env.organizationId),
    eq(migration.environmentId, env.environmentId),
  );
}

/** The last characters of a key, to tell imports apart (never enough to use it). */
export function credentialHint(apiKey: string): string {
  return apiKey.length > 12 ? `…${apiKey.slice(-4)}` : "…";
}

/**
 * Stores a checked connection: the key encrypted, `inspecting` until the worker has read what the
 * provider has. `null` when the environment isn't the organization's.
 */
export async function connectMigration(
  env: MigrationEnvironment,
  input: {
    provider: MigrationProvider;
    apiKey: string;
    options: SourceOptions;
    userId: string | null;
    now?: Date;
  },
  deps: { secretsKeys: SecretsKeyRing },
): Promise<MigrationRow | null> {
  const [found] = await db
    .select({ projectId: environment.projectId })
    .from(environment)
    .where(
      and(
        eq(environment.id, env.environmentId),
        eq(environment.organizationId, env.organizationId),
      ),
    )
    .limit(1);
  if (!found) return null;
  const [row] = await db
    .insert(migration)
    .values({
      organizationId: env.organizationId,
      projectId: found.projectId,
      environmentId: env.environmentId,
      provider: input.provider,
      credentialsCiphertext: encryptSecret(input.apiKey, deps.secretsKeys),
      credentialHint: credentialHint(input.apiKey),
      source: input.options,
      createdByUserId: input.userId,
      nextRunAt: input.now ?? new Date(),
    })
    .returning();
  return row ?? null;
}

export async function getMigration(
  env: MigrationEnvironment,
  id: string,
): Promise<MigrationRow | null> {
  if (!isId("mig", id)) return null;
  const [row] = await db
    .select()
    .from(migration)
    .where(and(inEnvironment(env), eq(migration.id, id)))
    .limit(1);
  return row ?? null;
}

export async function listMigrations(
  env: MigrationEnvironment,
  opts: { limit?: number } = {},
): Promise<MigrationRow[]> {
  return db
    .select()
    .from(migration)
    .where(inEnvironment(env))
    .orderBy(desc(migration.createdAt))
    .limit(opts.limit ?? 50);
}

export async function listMigrationItems(
  env: MigrationEnvironment,
  migrationId: string,
): Promise<MigrationItemRow[]> {
  if (!(await getMigration(env, migrationId))) return [];
  return db
    .select()
    .from(migrationItem)
    .where(
      and(
        eq(migrationItem.organizationId, env.organizationId),
        eq(migrationItem.migrationId, migrationId),
      ),
    )
    .orderBy(asc(migrationItem.kind), asc(migrationItem.createdAt));
}

/**
 * Starts a `ready` import with the customer's choice (a compare-and-set: starting twice starts
 * once). Returns the started row, or `null` when it wasn't ready.
 */
export async function startMigration(
  env: MigrationEnvironment,
  id: string,
  selection: MigrationSelection,
  now: Date = new Date(),
): Promise<MigrationRow | null> {
  if (!isId("mig", id)) return null;
  const progress: MigrationProgress = Object.fromEntries(
    phasesFor(selection.kinds).map((phase) => [phase, emptyProgress()]),
  );
  const [row] = await db
    .update(migration)
    .set({ status: "queued", selection, progress, nextRunAt: now, attemptCount: 0 })
    .where(
      and(
        inEnvironment(env),
        eq(migration.id, id),
        eq(migration.status, "ready"),
        isNotNull(migration.credentialsCiphertext),
      ),
    )
    .returning();
  return row ?? null;
}

/**
 * Cancels an import that hasn't finished and deletes the provider's key. What it already imported
 * stays. Returns the canceled row, or `null` when there was nothing to cancel.
 */
export async function cancelMigration(
  env: MigrationEnvironment,
  id: string,
  now: Date = new Date(),
): Promise<MigrationRow | null> {
  if (!isId("mig", id)) return null;
  const [row] = await db
    .update(migration)
    .set({
      status: "canceled",
      credentialsCiphertext: null,
      leaseUntil: null,
      nextRunAt: null,
      finishedAt: now,
    })
    .where(
      and(
        inEnvironment(env),
        eq(migration.id, id),
        inArray(migration.status, [...ACTIVE_MIGRATION_STATUSES]),
      ),
    )
    .returning();
  return row ?? null;
}

/** The inventory the worker stored, typed. */
export function inventoryOf(row: Pick<MigrationRow, "inventory">): Inventory | null {
  return (row.inventory as Inventory | null) ?? null;
}

export function selectionOf(row: Pick<MigrationRow, "selection">): MigrationSelection | null {
  return (row.selection as MigrationSelection | null) ?? null;
}

export function progressOf(row: Pick<MigrationRow, "progress">): MigrationProgress {
  return (row.progress as MigrationProgress | null) ?? {};
}
