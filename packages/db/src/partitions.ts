/**
 * Daily range partitions (`<table>_pYYYYMMDD`, UTC days) for high-volume tables. The worker keeps a
 * week of partitions ahead and drops expired ones: dropping a whole partition is how retention
 * stays cheap at any volume.
 *
 * Two kinds of table:
 * - with a default partition (`log_entry`): rows outside every daily partition still land
 *   somewhere. Dropping takes an ACCESS EXCLUSIVE lock on the parent, briefly.
 * - without one (Hooks): an insert outside the created days fails, so partitions must stay ahead;
 *   in exchange expired days are detached `CONCURRENTLY` (Postgres refuses that while a default
 *   partition exists), which never blocks reads or writes of the other days.
 */
import { sql } from "drizzle-orm";
import { db, pool } from "./client.ts";

const DAY_MS = 24 * 60 * 60 * 1000;
const IDENTIFIER = /^[a-z_][a-z0-9_]{0,40}$/;

export type PartitionedTable = {
  table: string;
  /** The `timestamptz` partition key. */
  column: string;
  /** Whether `<table>_default` exists. */
  defaultPartition: boolean;
};

export type Partition = { name: string; day: Date };

function checked(identifier: string): string {
  if (!IDENTIFIER.test(identifier)) throw new Error(`Invalid identifier: ${identifier}`);
  return identifier;
}

export function utcDay(time: number): Date {
  return new Date(Math.floor(time / DAY_MS) * DAY_MS);
}

export function partitionName(table: string, day: Date): string {
  return `${checked(table)}_p${day.toISOString().slice(0, 10).replaceAll("-", "")}`;
}

function dayOf(table: string, name: string): Date | null {
  const match = new RegExp(`^${table}_p(\\d{4})(\\d{2})(\\d{2})$`).exec(name);
  return match ? new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00Z`) : null;
}

/** The daily partitions attached to `table` and the day each starts, oldest first. */
export async function listPartitions(table: string): Promise<Partition[]> {
  checked(table);
  const result = await db.execute<{ name: string }>(sql`
    select child.relname as name
    from pg_inherits
    join pg_class child on child.oid = pg_inherits.inhrelid
    join pg_class parent on parent.oid = pg_inherits.inhparent
    join pg_namespace ns on ns.oid = parent.relnamespace
    where parent.relname = ${table} and ns.nspname = current_schema()
  `);
  return result.rows
    .flatMap(({ name }) => {
      const day = dayOf(table, name);
      return day ? [{ name, day }] : [];
    })
    .sort((a, b) => a.day.getTime() - b.day.getTime());
}

/**
 * Creates the partitions from yesterday to `aheadDays` days ahead that don't exist yet. With a
 * default partition, rows it already holds for a new day are moved into it (Postgres refuses to
 * attach a partition whose range the default partition still has rows for). Returns the names
 * created.
 */
export async function ensurePartitions(
  spec: PartitionedTable,
  options: { now?: Date; aheadDays?: number } = {},
): Promise<string[]> {
  const table = checked(spec.table);
  const column = checked(spec.column);
  const now = (options.now ?? new Date()).getTime();
  const aheadDays = options.aheadDays ?? 7;
  const existing = new Set((await listPartitions(table)).map((partition) => partition.name));
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
      if (spec.defaultPartition) {
        await tx.execute(
          sql.raw(
            `with moved as (delete from "${table}_default" where "${column}" >= '${from}' and "${column}" < '${to}' returning *) ` +
              `insert into "${name}" select * from moved`,
          ),
        );
      }
      await tx.execute(
        sql.raw(
          `alter table "${table}" attach partition "${name}" for values from ('${from}') to ('${to}')`,
        ),
      );
      return true;
    });
    if (attached) created.push(name);
  }
  if (!spec.defaultPartition) {
    // Inserts beyond the last partition fail outright: say so long before that happens.
    const last = (await listPartitions(table)).at(-1);
    if (!last || last.day.getTime() < utcDay(now).getTime() + 2 * DAY_MS) {
      console.error(
        `[partitions] ${table} has partitions only until ${last?.day.toISOString() ?? "never"}`,
      );
    }
  }
  return created;
}

/**
 * Drops the daily partitions that ended before `now - retentionDays`, and the default partition's
 * rows that old (in batches). Returns the names dropped.
 */
export async function dropExpiredPartitions(
  spec: PartitionedTable,
  options: { now?: Date; retentionDays: number; batchSize?: number },
): Promise<string[]> {
  const table = checked(spec.table);
  const column = checked(spec.column);
  const now = (options.now ?? new Date()).getTime();
  const cutoff = utcDay(now - options.retentionDays * DAY_MS);
  const expired = (name: string) => {
    const day = dayOf(table, name);
    return day !== null && day.getTime() + DAY_MS <= cutoff.getTime();
  };
  const dropped: string[] = [];
  for (const partition of await listPartitions(table)) {
    if (!expired(partition.name)) continue;
    if (spec.defaultPartition) {
      await db.transaction(async (tx) => {
        await tx.execute(sql`set local lock_timeout = '5s'`);
        await tx.execute(sql.raw(`drop table if exists "${partition.name}"`));
      });
    } else {
      await detachConcurrently(table, partition.name);
      await db.execute(sql.raw(`drop table if exists "${partition.name}"`));
    }
    dropped.push(partition.name);
  }
  if (!spec.defaultPartition) {
    // A detach interrupted before its drop leaves a plain table behind: finish it.
    for (const name of await detachedLeftovers(table)) {
      if (!expired(name)) continue;
      await db.execute(sql.raw(`drop table if exists "${name}"`));
      dropped.push(name);
    }
    return dropped;
  }
  const batchSize = options.batchSize ?? 10_000;
  for (;;) {
    const deleted = await db.execute(
      sql.raw(
        `delete from "${table}_default" where ctid in (select ctid from "${table}_default" where "${column}" < '${cutoff.toISOString()}' limit ${Math.floor(batchSize)})`,
      ),
    );
    if ((deleted.rowCount ?? 0) < batchSize) break;
  }
  return dropped;
}

/**
 * `DETACH PARTITION … CONCURRENTLY` (outside any transaction, so on its own connection). A detach
 * an earlier run started but didn't finish is finalized instead.
 */
async function detachConcurrently(table: string, name: string): Promise<void> {
  const client = await pool.connect();
  try {
    const pending = await client.query<{ pending: boolean }>(
      "select inhdetachpending as pending from pg_inherits where inhparent = $1::regclass and inhrelid = to_regclass($2)",
      [table, name],
    );
    const mode = pending.rows[0]?.pending ? "finalize" : "concurrently";
    await client.query(`alter table "${table}" detach partition "${name}" ${mode}`);
  } finally {
    client.release();
  }
}

/** Tables named like `table`'s partitions that are no longer attached to it. */
async function detachedLeftovers(table: string): Promise<string[]> {
  const result = await db.execute<{ name: string }>(sql`
    select c.relname as name
    from pg_class c
    join pg_namespace ns on ns.oid = c.relnamespace
    where ns.nspname = current_schema() and c.relkind = 'r'
      and c.relname ~ ${`^${table}_p[0-9]{8}$`}
      and not exists (select 1 from pg_inherits where inhrelid = c.oid)
  `);
  return result.rows.map((row) => row.name);
}
