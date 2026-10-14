import { slugify } from "@coss/auth/slugs";
import { db, schema } from "@coss/db";
import { and, asc, eq, like, or } from "drizzle-orm";
import { compareEnvironments, DEFAULT_ENVIRONMENTS } from "./environments.ts";
import { PG_FOREIGN_KEY_VIOLATION, pgErrorCode, TenancyError } from "./errors.ts";
import type { Environment, Project } from "./types.ts";

export const PROJECT_NAME_MAX_LENGTH = 64;

/** Concurrent creates can steal a free slug between our read and insert; retry this often. */
const MAX_SLUG_ATTEMPTS = 20;

const { environment, project } = schema;

/** `base`, `base-2`, `base-3`, … — the first one not in `taken`. */
function firstFreeSlug(base: string, taken: ReadonlySet<string>): string {
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) {
    const candidate = `${base}-${n}`;
    if (!taken.has(candidate)) return candidate;
  }
}

/**
 * Creates a project with its default environments (production/live, development/sandbox) in one
 * transaction. The slug is derived from the name and suffixed (`-2`, `-3`, …) when taken.
 */
export async function createProject(input: {
  organizationId: string;
  name: string;
}): Promise<{ project: Project; environments: Environment[] }> {
  const name = input.name.trim();
  if (name.length === 0 || name.length > PROJECT_NAME_MAX_LENGTH) {
    throw new TenancyError(
      "invalid",
      `Project name must be 1-${PROJECT_NAME_MAX_LENGTH} characters.`,
    );
  }
  const { organizationId } = input;
  const base = slugify(name) || "project";

  try {
    return await db.transaction(async (tx) => {
      // Slugs only contain [a-z0-9-], so `base` is safe inside a LIKE pattern.
      const existing = await tx
        .select({ slug: project.slug })
        .from(project)
        .where(
          and(
            eq(project.organizationId, organizationId),
            or(eq(project.slug, base), like(project.slug, `${base}-%`)),
          ),
        );
      const taken = new Set(existing.map((row) => row.slug));

      for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt++) {
        const slug = firstFreeSlug(base, taken);
        // DO NOTHING (instead of catching a unique violation) keeps the transaction usable.
        const [created] = await tx
          .insert(project)
          .values({ organizationId, name, slug })
          .onConflictDoNothing({ target: [project.organizationId, project.slug] })
          .returning();
        if (!created) {
          taken.add(slug);
          continue;
        }
        const environments = await tx
          .insert(environment)
          .values(
            DEFAULT_ENVIRONMENTS.map((env) => ({ ...env, organizationId, projectId: created.id })),
          )
          .returning();
        return { project: created, environments: environments.sort(compareEnvironments) };
      }
      throw new TenancyError("conflict", "Could not allocate a unique project slug. Try again.");
    });
  } catch (error) {
    if (pgErrorCode(error) === PG_FOREIGN_KEY_VIOLATION) {
      throw new TenancyError("not_found", "Organization not found.");
    }
    throw error;
  }
}

/** Projects of an organization, oldest first. */
export async function listProjects(input: { organizationId: string }): Promise<Project[]> {
  return db
    .select()
    .from(project)
    .where(eq(project.organizationId, input.organizationId))
    .orderBy(asc(project.createdAt), asc(project.id));
}

/**
 * Projects of an organization (oldest first), each with its environments in display order: one
 * query, for navigation that lists every project's environments.
 */
export async function listProjectsWithEnvironments(input: {
  organizationId: string;
}): Promise<{ project: Project; environments: Environment[] }[]> {
  const rows = await db
    .select({ project, environment })
    .from(project)
    .innerJoin(
      environment,
      and(
        eq(environment.projectId, project.id),
        eq(environment.organizationId, project.organizationId),
      ),
    )
    .where(eq(project.organizationId, input.organizationId))
    .orderBy(asc(project.createdAt), asc(project.id));
  const byProject = new Map<string, { project: Project; environments: Environment[] }>();
  for (const row of rows) {
    const entry = byProject.get(row.project.id) ?? { project: row.project, environments: [] };
    entry.environments.push(row.environment);
    byProject.set(row.project.id, entry);
  }
  for (const entry of byProject.values()) entry.environments.sort(compareEnvironments);
  return [...byProject.values()];
}

export async function getProject(input: {
  organizationId: string;
  slug: string;
}): Promise<Project | null> {
  const [row] = await db
    .select()
    .from(project)
    .where(and(eq(project.organizationId, input.organizationId), eq(project.slug, input.slug)))
    .limit(1);
  return row ?? null;
}
