/**
 * The log drain outbox: every log line and environment audit event is copied to the enabled drains of
 * its environment that take its source, in the statement (or transaction) that writes it. The worker
 * batches and delivers them (`@coss/webhooks` log drains). Environments without drains pay one
 * indexed lookup.
 */
import { type Executor, schema } from "@coss/db";
import { ID_PREFIXES, newId } from "@coss/db/id";
import { and, eq, inArray } from "drizzle-orm";
import type { LogDrainSource } from "./schemas.ts";

const { logDrain, logDrainRecord } = schema;

export type LogDrainLine = {
  organizationId: string;
  environmentId: string;
  source: LogDrainSource;
  /** The `log_…` or `oaudit_…` id (a line is queued once per drain). */
  sourceId: string;
  /** The wire object, as the API returns it. */
  line: Record<string, unknown>;
};

export type ActiveDrain = {
  id: string;
  organizationId: string;
  environmentId: string;
  sources: LogDrainSource[];
};

/** Select inside the insertion transaction; management takes FOR UPDATE before changing eligibility. */
export async function activeLogDrains(
  executor: Executor,
  environmentIds: readonly string[],
): Promise<ActiveDrain[]> {
  if (environmentIds.length === 0) return [];
  return executor
    .select({
      id: logDrain.id,
      organizationId: logDrain.organizationId,
      environmentId: logDrain.environmentId,
      sources: logDrain.sources,
    })
    .from(logDrain)
    .where(
      and(
        inArray(logDrain.environmentId, [...new Set(environmentIds)]),
        eq(logDrain.enabled, true),
      ),
    )
    .orderBy(logDrain.id)
    .for("key share");
}

/** Bytes of a line in an NDJSON body, newline included. */
export function lineByteSize(line: Record<string, unknown>): number {
  return Buffer.byteLength(JSON.stringify(line)) + 1;
}

/** Queues each line for the given drains that take its source; returns how many records were written. */
export async function insertLogDrainRecords(
  executor: Executor,
  drains: readonly ActiveDrain[],
  lines: readonly LogDrainLine[],
): Promise<number> {
  const values: (typeof logDrainRecord.$inferInsert)[] = [];
  for (const entry of lines) {
    for (const drain of drains) {
      if (drain.environmentId !== entry.environmentId) continue;
      // A drain belongs to its environment's organization; never cross it.
      if (drain.organizationId !== entry.organizationId) continue;
      if (drain.sources.length > 0 && !drain.sources.includes(entry.source)) continue;
      values.push({
        organizationId: entry.organizationId,
        drainId: drain.id,
        source: entry.source,
        sourceId: entry.sourceId,
        line: entry.line,
        byteSize: lineByteSize(entry.line),
      });
    }
  }
  if (values.length === 0) return 0;
  // Ids order delivery: make them ascend in the order the lines were written (random ids of one
  // millisecond would shuffle them).
  const now = Date.now();
  const ids = values.map(() => newId(ID_PREFIXES.logDrainRecord, now)).sort();
  values.forEach((value, index) => {
    value.id = ids[index];
  });
  await executor.insert(logDrainRecord).values(values).onConflictDoNothing();
  return values.length;
}
