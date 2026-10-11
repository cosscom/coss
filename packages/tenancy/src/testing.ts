/**
 * Test fixtures shared by the tenancy, email and API test suites. Every call creates new,
 * uniquely named rows (tests never truncate). Requires the `@coss/db/testing` preload.
 */
import { auth } from "@coss/auth";
import { pool } from "@coss/db";
import { uniqueSuffix } from "@coss/db/testing";
import { createEnvironmentApiKey } from "./api-keys.ts";
import { createProject } from "./projects.ts";
import type { Environment, Project } from "./types.ts";

export type TestUser = { id: string; email: string; password: string };

export type TestTenant = {
  owner: TestUser;
  organization: { id: string; slug: string; name: string };
  project: Project;
  production: Environment;
  development: Environment;
  /** Plaintext `coss_live_…` key bound to `production`. */
  liveKey: string;
  /** Plaintext `coss_test_…` key bound to `development`. */
  sandboxKey: string;
};

/**
 * Import order can create the shared pool before the preload swaps DATABASE_URL, so check the
 * pool itself rather than the environment.
 */
function assertTestDatabase(): void {
  const url = pool.options.connectionString;
  const name = url ? new URL(url).pathname.slice(1) : "";
  if (!name.endsWith("_test")) {
    throw new Error(
      `Test fixtures refuse to write to "${name || "<unset>"}". Preload @coss/db/testing first.`,
    );
  }
}

/** Every fixture user shares this password (each user still gets its own credential row). */
const TEST_PASSWORD = "coss-test-password-not-secret";
let testPasswordHash: Promise<string> | undefined;

/**
 * Creates a user with a password credential. `emailVerified` defaults to true.
 *
 * Does what Better Auth's admin `createUser` does with a password, but hashes the shared password
 * once per process: scrypt costs ~45 ms of CPU per call, which was half of the DB suites' runtime.
 */
export async function createTestUser(
  opts: { emailVerified?: boolean; name?: string } = {},
): Promise<TestUser> {
  assertTestDatabase();
  const suffix = uniqueSuffix();
  const email = `user-${suffix}@coss.test`;
  const { user } = await auth.api.createUser({
    body: {
      email,
      name: opts.name ?? `Test User ${suffix}`,
      data: { emailVerified: opts.emailVerified ?? true },
    },
  });
  const context = await auth.$context;
  testPasswordHash ??= context.password.hash(TEST_PASSWORD);
  await context.internalAdapter.linkAccount({
    providerId: "credential",
    accountId: user.id,
    password: await testPasswordHash,
    userId: user.id,
  });
  return { id: user.id, email: user.email, password: TEST_PASSWORD };
}

/** Server-side membership grant (no session or invitation involved). */
export async function addMember(input: {
  organizationId: string;
  userId: string;
  role: "admin" | "member";
}): Promise<void> {
  assertTestDatabase();
  await auth.api.addMember({
    body: { organizationId: input.organizationId, userId: input.userId, role: input.role },
  });
}

/** An owner, an organization, a project with both environments, and one key per environment. */
export async function createTestTenant(
  opts: { emailVerified?: boolean } = {},
): Promise<TestTenant> {
  const owner = await createTestUser({ emailVerified: opts.emailVerified });
  const suffix = uniqueSuffix();
  const organization = await auth.api.createOrganization({
    body: { name: `Test Org ${suffix}`, slug: `test-${suffix}`, userId: owner.id },
  });
  if (!organization) throw new Error("Better Auth did not return the created organization.");

  const { project, environments } = await createProject({
    organizationId: organization.id,
    name: "Test Project",
  });
  const production = environments.find((env) => env.mode === "live");
  const development = environments.find((env) => env.mode === "sandbox");
  if (!production || !development) throw new Error("Project is missing its default environments.");

  const live = await createEnvironmentApiKey({
    organizationId: organization.id,
    environmentId: production.id,
    name: "Test live key",
    userId: owner.id,
  });
  const sandbox = await createEnvironmentApiKey({
    organizationId: organization.id,
    environmentId: development.id,
    name: "Test sandbox key",
    userId: owner.id,
  });

  return {
    owner,
    organization: { id: organization.id, slug: organization.slug, name: organization.name },
    project,
    production,
    development,
    liveKey: live.key,
    sandboxKey: sandbox.key,
  };
}
