/**
 * The partitioned tables (no database access here, so the migration script and the test preload
 * can use it before `@coss/db` exists).
 */

export type PartitionedTable = {
  table: string;
  /** The `timestamptz` partition key. */
  column: string;
  /** Whether `<table>_default` exists. */
  defaultPartition: boolean;
};

export const LOG_ENTRY_PARTITIONS: PartitionedTable = {
  table: "log_entry",
  column: "occurred_at",
  defaultPartition: true,
};

/** Dropped together, children first, so a delivery never outlives its message. */
export const HOOK_PARTITIONS: readonly PartitionedTable[] = [
  { table: "hook_attempt", column: "message_created_at", defaultPartition: false },
  { table: "hook_delivery", column: "message_created_at", defaultPartition: false },
  { table: "hook_message", column: "created_at", defaultPartition: false },
];

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Idempotent SQL creating `table`'s daily partitions from yesterday to `aheadDays` ahead. For tables
 * without a default partition only (attaching next to a default partition may need rows moved).
 */
export function aheadPartitionsSql(spec: PartitionedTable, now: Date, aheadDays = 7): string[] {
  if (spec.defaultPartition) throw new Error(`${spec.table} has a default partition`);
  const statements: string[] = [];
  for (let offset = -1; offset <= aheadDays; offset++) {
    const day = new Date(Math.floor(now.getTime() / DAY_MS + offset) * DAY_MS);
    const next = new Date(day.getTime() + DAY_MS);
    const name = `${spec.table}_p${day.toISOString().slice(0, 10).replaceAll("-", "")}`;
    statements.push(
      `create table if not exists "${name}" partition of "${spec.table}" for values from ('${day.toISOString()}') to ('${next.toISOString()}')`,
    );
  }
  return statements;
}
