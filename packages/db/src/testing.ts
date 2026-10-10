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

/** Unique suffix for test fixtures. Tests never truncate; every test creates its own data. */
export function uniqueSuffix(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
