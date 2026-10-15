import type { EnvironmentMode } from "@coss/tenancy";

type EnvironmentLike = { id: string; mode: EnvironmentMode };

/**
 * The environment a project opens on (the sidebar, the project tiles, `/<org>/projects/<slug>`):
 * its first live environment that has sent an email (`sent`, from `environmentsWithSentEmail`),
 * else its first sandbox one. A new project starts in development and moves to production once it
 * goes live. `environments` are in display order (`compareEnvironments`).
 */
export function defaultEnvironment<T extends EnvironmentLike>(
  environments: readonly T[],
  sent: ReadonlySet<string>,
): T | undefined {
  return (
    environments.find((env) => env.mode === "live" && sent.has(env.id)) ??
    environments.find((env) => env.mode === "sandbox") ??
    environments[0]
  );
}

/** Every live environment of these projects: the ones `environmentsWithSentEmail` must check. */
export function liveEnvironmentIds(
  projects: readonly { environments: readonly EnvironmentLike[] }[],
): string[] {
  return projects.flatMap((entry) =>
    entry.environments.filter((env) => env.mode === "live").map((env) => env.id),
  );
}
