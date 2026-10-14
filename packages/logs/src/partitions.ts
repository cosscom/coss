import {
  dropExpiredPartitions,
  ensurePartitions,
  listPartitions,
  type PartitionedTable,
} from "@coss/db/partitions";

/**
 * `log_entry` is partitioned by UTC day (`log_entry_pYYYYMMDD`) with a default partition
 * (migration 0028), managed by `@coss/db/partitions`.
 */
export const LOG_TABLE = "log_entry";
export const DEFAULT_LOG_RETENTION_DAYS = 30;

type PartitionOptions = {
  now?: Date;
  /** Tests run against their own partitioned copy. */
  table?: string;
};

function spec(table = LOG_TABLE): PartitionedTable {
  return { table, column: "occurred_at", defaultPartition: true };
}

/** The daily partitions of `table` and the day each starts. */
export function listLogPartitions(
  options: { table?: string } = {},
): Promise<{ name: string; day: Date }[]> {
  return listPartitions(options.table ?? LOG_TABLE);
}

/** Creates the partitions from yesterday to `aheadDays` days ahead that don't exist yet. */
export function ensureLogPartitions(
  options: PartitionOptions & { aheadDays?: number } = {},
): Promise<string[]> {
  return ensurePartitions(spec(options.table), options);
}

/**
 * Drops the daily partitions that ended before `now - retentionDays` and deletes the default
 * partition's rows that old. Returns the names dropped.
 */
export function dropExpiredLogPartitions(
  options: PartitionOptions & { retentionDays?: number } = {},
): Promise<string[]> {
  return dropExpiredPartitions(spec(options.table), {
    now: options.now,
    retentionDays: options.retentionDays ?? DEFAULT_LOG_RETENTION_DAYS,
  });
}
