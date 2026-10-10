import { db, schema } from "@coss/db";
import { and, eq } from "drizzle-orm";
import type { Environment, Project } from "./types.ts";

/** Every project is created with exactly these environments, in display order. */
export const DEFAULT_ENVIRONMENTS = [
  { name: "Production", slug: "production", mode: "live" },
  { name: "Development", slug: "development", mode: "sandbox" },
] as const satisfies readonly Pick<Environment, "name" | "slug" | "mode">[];

const DEFAULT_SLUG_ORDER: readonly string[] = DEFAULT_ENVIRONMENTS.map((env) => env.slug);

function displayRank(slug: string): number {
  const index = DEFAULT_SLUG_ORDER.indexOf(slug);
  return index === -1 ? DEFAULT_SLUG_ORDER.length : index;
}

/** Production first, then development, then any others by creation time. */
export function compareEnvironments(a: Environment, b: Environment): number {
  return (
    displayRank(a.slug) - displayRank(b.slug) ||
    a.createdAt.getTime() - b.createdAt.getTime() ||
    a.id.localeCompare(b.id)
  );
}

const { environment, project } = schema;

export async function listEnvironments(input: {
  organizationId: string;
  projectId: string;
}): Promise<Environment[]> {
  const rows = await db
    .select()
    .from(environment)
    .where(
      and(
        eq(environment.organizationId, input.organizationId),
        eq(environment.projectId, input.projectId),
      ),
    );
  // A handful of rows per project: sorting here keeps the order rules in one place.
  return rows.sort(compareEnvironments);
}

export async function getEnvironment(input: {
  organizationId: string;
  projectSlug: string;
  envSlug: string;
}): Promise<{ project: Project; environment: Environment } | null> {
  const [row] = await db
    .select({ project, environment })
    .from(environment)
    .innerJoin(
      project,
      and(
        eq(project.id, environment.projectId),
        eq(project.organizationId, environment.organizationId),
      ),
    )
    .where(
      and(
        eq(project.organizationId, input.organizationId),
        eq(project.slug, input.projectSlug),
        eq(environment.slug, input.envSlug),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function getEnvironmentById(input: {
  organizationId: string;
  environmentId: string;
}): Promise<Environment | null> {
  const [row] = await db
    .select()
    .from(environment)
    .where(
      and(
        eq(environment.id, input.environmentId),
        eq(environment.organizationId, input.organizationId),
      ),
    )
    .limit(1);
  return row ?? null;
}
