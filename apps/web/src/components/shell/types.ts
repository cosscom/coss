import type { EnvironmentMode } from "@coss/tenancy";

/** Plain data the shell's client components get from the layouts. */
export type ShellOrganization = { name: string; slug: string };

export type ShellEnvironment = { name: string; slug: string; mode: EnvironmentMode };

export type ShellProject = { name: string; slug: string; environments: ShellEnvironment[] };
