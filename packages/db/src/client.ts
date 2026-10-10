import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema/index.ts";

// TLS comes from DATABASE_URL: on RDS `?sslmode=verify-full&sslrootcert=<CA bundle>` (pg reads the
// file; the images ship /etc/ssl/certs/rds-global-bundle.pem). Size the pool so that tasks ×
// DATABASE_POOL_MAX stays below the database's max_connections.
// Reuse one pool across Next.js HMR / `bun --hot` re-evaluations in development.
const globalForDb = globalThis as unknown as { __cossPgPool?: pg.Pool };

export const pool: pg.Pool =
  globalForDb.__cossPgPool ??
  new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
  });

if (process.env.NODE_ENV !== "production") globalForDb.__cossPgPool = pool;

export const db = drizzle({ client: pool, schema });

export type Database = typeof db;
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
/** A database handle or an open transaction. */
export type Executor = Database | Transaction;

export async function closeDb(): Promise<void> {
  globalForDb.__cossPgPool = undefined;
  await pool.end();
}
