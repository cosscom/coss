import { db } from "@coss/db";
import { sql } from "drizzle-orm";

/**
 * `log_entry` is partitioned by UTC day (`log_entry_pYYYYMMDD`) with a default partition
 * (migration 0021). The worker keeps a week of partitions ahead and drops expired ones; dropping a
 * whole partition is how retention stays cheap at any volume.
 */
export const LOG_TABLE = "log_entry";
export const DEFAULT_LOG_RETENTION_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
const TABLE_NAME = /^[a-z_][a-z0-9_]{0,40}$/;

type PartitionOptions = {
  now?: Date;
  /** Tests run against their own partitioned copy. */
  table?: string;
};

function checkedTable(table: string): string {
  if (!TABLE_NAME.test(table)) throw new Error(`Invalid table name: ${table}`);
  return table;
}

function utcDay(time: number): Date {
  return new Date(Math.floor(time / DAY_MS) * DAY_MS);
}

function partitionName(table: string, day: Date): string {
  return `${table}_p${day.toISOString().slice(0, 10).replaceAll("-", "")}`;
}

/** The daily partitions of `table` and the day each starts. */
export async function listLogPartitions(
  options: { table?: string } = {},
): Promise<{ name: string; day: Date }[]> {
  const table = checkedTable(options.table ?? LOG_TABLE);
  const result = await db.execute<{ name: string }>(sql`
    select child.relname as name
    from pg_inherits
    join pg_class child on child.oid = pg_inherits.inhrelid
    join pg_class parent on parent.oid = pg_inherits.inhparent
    join pg_namespace ns on ns.oid = parent.relnamespace
    where parent.relname = ${table} and ns.nspname = current_schema()
  `);
  const pattern = new RegExp(`^${table}_p(\\d{4})(\\d{2})(\\d{2})$`);
  return result.rows
    .flatMap(({ name }) => {
      const match = pattern.exec(name);
      return match
        ? [{ name, day: new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00Z`) }]
        : [];
    })
    .sort((a, b) => a.day.getTime() - b.day.getTime());
}

/**
 * Creates the partitions from yesterday to `aheadDays` days ahead that don't exist yet. Rows the
 * default partition already holds for a new day are moved into it (Postgres refuses to attach a
 * partition whose range the default partition still has rows for). Returns the names created.
 */
export async function ensureLogPartitions(
  options: PartitionOptions & { aheadDays?: number } = {},
): Promise<string[]> {
  const table = checkedTable(options.table ?? LOG_TABLE);
  const now = (options.now ?? new Date()).getTime();
  const aheadDays = options.aheadDays ?? 7;
  const existing = new Set((await listLogPartitions({ table })).map((partition) => partition.name));
  const created: string[] = [];
  for (let offset = -1; offset <= aheadDays; offset++) {
    const day = utcDay(now + offset * DAY_MS);
    const name = partitionName(table, day);
    if (existing.has(name)) continue;
    const from = day.toISOString();
    const to = new Date(day.getTime() + DAY_MS).toISOString();
    const attached = await db.transaction(async (tx) => {
      await tx.execute(sql`set local lock_timeout = '5s'`);
      // Several workers run this: one creates each partition, the others find it attached.
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`coss:partitions:${table}`}))`);
      const found = await tx.execute(sql`
        select 1 from pg_inherits
        where inhparent = ${table}::regclass and inhrelid = to_regclass(${name})
      `);
      if (found.rows.length > 0) return false;
      await tx.execute(
        sql.raw(`create table if not exists "${name}" (like "${table}" including defaults)`),
      );
      await tx.execute(
        sql.raw(
          `with moved as (delete from "${table}_default" where occurred_at >= '${from}' and occurred_at < '${to}' returning *) ` +
            `insert into "${name}" select * from moved`,
        ),
      );
      await tx.execute(
        sql.raw(
          `alter table "${table}" attach partition "${name}" for values from ('${from}') to ('${to}')`,
        ),
      );
      return true;
    });
    if (attached) created.push(name);
  }
  return created;
}

/**
 * Drops the daily partitions that ended before `now - retentionDays` and deletes the default
 * partition's rows that old. Returns the names dropped.
 */
export async function dropExpiredLogPartitions(
  options: PartitionOptions & { retentionDays?: number } = {},
): Promise<string[]> {
  const table = checkedTable(options.table ?? LOG_TABLE);
  const now = (options.now ?? new Date()).getTime();
  const retentionDays = options.retentionDays ?? DEFAULT_LOG_RETENTION_DAYS;
  const cutoff = utcDay(now - retentionDays * DAY_MS);
  const dropped: string[] = [];
  for (const partition of await listLogPartitions({ table })) {
    if (partition.day.getTime() + DAY_MS > cutoff.getTime()) continue;
    await db.transaction(async (tx) => {
      await tx.execute(sql`set local lock_timeout = '5s'`);
      await tx.execute(sql.raw(`drop table if exists "${partition.name}"`));
    });
    dropped.push(partition.name);
  }
  await db.execute(
    sql.raw(`delete from "${table}_default" where occurred_at < '${cutoff.toISOString()}'`),
  );
  return dropped;
}
