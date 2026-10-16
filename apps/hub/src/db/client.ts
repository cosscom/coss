import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema/index.ts";

/**
 * The hub's own database (`HUB_DATABASE_URL`, locally `coss_hub`): accounts (Better Auth) and
 * profiles. Nothing of coss.com's lives here, and nothing of the hub's lives in coss.com's.
 * One pool across Next.js HMR re-evaluations in development.
 */
const globalForDb = globalThis as unknown as { __hubPgPool?: pg.Pool };

export const pool: pg.Pool =
  globalForDb.__hubPgPool ??
  new pg.Pool({
    connectionString: process.env.HUB_DATABASE_URL,
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    min: 1,
    idleTimeoutMillis: 5 * 60_000,
    allowExitOnIdle: true,
    keepAlive: true,
  });

if (process.env.NODE_ENV !== "production") globalForDb.__hubPgPool = pool;

export const db = drizzle({ client: pool, schema });

export type Database = typeof db;
