/**
 * Test bootstrap. Import this FIRST (via each package's `test/setup.ts` preload) so the shared
 * `db` singleton points at the test database. Refuses to run against anything not named `*_test`.
 */
const url = process.env.TEST_DATABASE_URL;
if (!url) {
  throw new Error("TEST_DATABASE_URL is not set (see .env.example). Refusing to run DB tests.");
}
const databaseName = new URL(url).pathname.replace(/^\//, "");
if (!databaseName.endsWith("_test")) {
  throw new Error(`TEST_DATABASE_URL must point at a *_test database (got "${databaseName}").`);
}
process.env.DATABASE_URL = url;
process.env.BETTER_AUTH_SECRET ??= "coss-test-secret-coss-test-secret-0123456789";
process.env.BETTER_AUTH_URL ??= "http://localhost:3000";

// Tables without a default partition reject rows outside their days; a test database migrated a
// while ago still needs this week's (normally the worker creates them).
await ensureTestPartitions(url);

async function ensureTestPartitions(connectionString: string): Promise<void> {
  const { default: pg } = await import("pg");
  const { aheadPartitionsSql, HOOK_PARTITIONS } = await import("./partition-specs.ts");
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    // Test processes start in parallel: one creates the partitions, the others find them.
    await client.query("select pg_advisory_lock(hashtext('coss:test-partitions'))");
    const parents = await client.query<{ name: string }>(
      "select relname as name from pg_class where relkind = 'p' and relname = any($1)",
      [HOOK_PARTITIONS.map((spec) => spec.table)],
    );
    const migrated = new Set(parents.rows.map((row) => row.name));
    for (const spec of HOOK_PARTITIONS) {
      if (!migrated.has(spec.table)) continue;
      for (const statement of aheadPartitionsSql(spec, new Date())) await client.query(statement);
    }
  } finally {
    await client.end();
  }
}

/** Unique suffix for test fixtures. Tests never truncate; every test creates its own data. */
export function uniqueSuffix(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
