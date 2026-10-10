/**
 * Background jobs on pg-boss, in the app database's `pgboss` schema. `bun run db:migrate` installs
 * and upgrades that schema (`src/migrate.ts`); processes only check it on start (`migrate: false`), so several
 * instances never race a pg-boss upgrade.
 */
import { sql } from "drizzle-orm";
import { fromDrizzle, PgBoss } from "pg-boss";
import { pool, type Transaction } from "./client.ts";

export type { Job, SendOptions } from "pg-boss";
export { PgBoss } from "pg-boss";

export type JobBossOptions = {
  /**
   * Workers: run pg-boss maintenance (expiring, retrying and deleting jobs) and wake up on NOTIFY.
   * This opens a pg-boss pool and one LISTEN connection on `DATABASE_URL`. Producers (the API)
   * leave it off and share the `@coss/db` pool.
   */
  worker?: boolean;
};

/** A started pg-boss instance. `stop()` it on shutdown (it never closes the shared pool). */
export async function startJobBoss(opts: JobBossOptions = {}): Promise<PgBoss> {
  const common = { migrate: false, schedule: false } as const;
  const boss = opts.worker
    ? new PgBoss({
        ...common,
        connectionString: process.env.DATABASE_URL,
        max: 4,
        supervise: true,
        useListenNotify: true,
        application_name: "coss-worker-jobs",
      })
    : new PgBoss({
        ...common,
        supervise: false,
        db: { executeSql: (text, values) => pool.query(text, values) },
      });
  boss.on("error", (error) => console.error("[jobs] pg-boss error:", error));
  return boss.start();
}

/** Runs pg-boss statements (e.g. `send`) inside a Drizzle transaction: the job commits with it. */
export function inTransaction(tx: Transaction): { db: ReturnType<typeof fromDrizzle> } {
  return { db: fromDrizzle(tx, sql) };
}
