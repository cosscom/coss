/**
 * Idempotent local seed (`bun run db:seed`): demo admin user, org `acme`, project `default`,
 * and a fresh development (sandbox) API key printed as `COSS_API_KEY=…`.
 */
import { auth } from "@coss/auth";
import { closeDb, db, schema } from "@coss/db";
import { and, eq } from "drizzle-orm";
import {
  createEnvironmentApiKey,
  createProject,
  getEnvironment,
  getProject,
  promoteToAdmin,
} from "../src/index.ts";

const DEMO_EMAIL = "demo@coss.local";
const DEMO_NAME = "Demo User";
const ORG_NAME = "Acme";
const ORG_SLUG = "acme";
const PROJECT_NAME = "Default";

async function ensureDemoUser(password: string): Promise<{ id: string; created: boolean }> {
  const [existing] = await db
    .select({ id: schema.user.id })
    .from(schema.user)
    .where(eq(schema.user.email, DEMO_EMAIL))
    .limit(1);
  if (existing) {
    await db
      .update(schema.user)
      .set({ emailVerified: true })
      .where(eq(schema.user.id, existing.id));
    return { id: existing.id, created: false };
  }
  const { user } = await auth.api.createUser({
    body: { email: DEMO_EMAIL, password, name: DEMO_NAME, data: { emailVerified: true } },
  });
  return { id: user.id, created: true };
}

async function ensureOrganization(userId: string): Promise<{ id: string; slug: string }> {
  const [existing] = await db
    .select({ id: schema.organization.id, slug: schema.organization.slug })
    .from(schema.organization)
    .where(eq(schema.organization.slug, ORG_SLUG))
    .limit(1);
  if (!existing) {
    const created = await auth.api.createOrganization({
      body: { name: ORG_NAME, slug: ORG_SLUG, userId },
    });
    if (!created) throw new Error("Better Auth did not return the created organization.");
    return { id: created.id, slug: created.slug };
  }
  const [membership] = await db
    .select({ id: schema.member.id })
    .from(schema.member)
    .where(and(eq(schema.member.organizationId, existing.id), eq(schema.member.userId, userId)))
    .limit(1);
  if (!membership) {
    await auth.api.addMember({ body: { organizationId: existing.id, userId, role: "owner" } });
  }
  return existing;
}

async function main(): Promise<void> {
  const password = process.env.SEED_PASSWORD || "coss-demo-password";

  const user = await ensureDemoUser(password);
  await promoteToAdmin(DEMO_EMAIL);
  const organization = await ensureOrganization(user.id);

  const project =
    (await getProject({ organizationId: organization.id, slug: "default" })) ??
    (await createProject({ organizationId: organization.id, name: PROJECT_NAME })).project;
  const found = await getEnvironment({
    organizationId: organization.id,
    projectSlug: project.slug,
    envSlug: "development",
  });
  if (!found) throw new Error(`Project "${project.slug}" has no development environment.`);

  const key = await createEnvironmentApiKey({
    organizationId: organization.id,
    environmentId: found.environment.id,
    name: `Seed ${new Date().toISOString().slice(0, 16)}`,
    userId: user.id,
  });

  const passwordNote = user.created ? password : "(unchanged; user already existed)";
  console.info(
    [
      "Seeded COSS demo data:",
      `  user:         ${DEMO_EMAIL} (platform admin)`,
      `  password:     ${passwordNote}`,
      `  organization: ${organization.slug}`,
      `  project:      ${project.slug}`,
      `  environment:  ${found.environment.slug} (${found.environment.mode})`,
      "",
      `COSS_API_KEY=${key.key}`,
    ].join("\n"),
  );
}

if (process.env.NODE_ENV === "production") {
  console.error("Refusing to seed demo data with NODE_ENV=production.");
  process.exitCode = 1;
} else {
  try {
    await main();
  } catch (error) {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  } finally {
    await closeDb();
  }
}
