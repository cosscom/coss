/**
 * Every public API version, oldest first. A version is the date its breaking changes shipped; the newest one is
 * what handlers produce. Adding a version: append its date here and describe what changed in `VERSION_CHANGES`
 * (`changes.ts`), with the transforms that turn the new shapes back into the previous ones.
 */
export const API_VERSIONS = ["2026-10-10"] as const;

export type ApiVersion = (typeof API_VERSIONS)[number];

export const LATEST_API_VERSION: ApiVersion = API_VERSIONS[API_VERSIONS.length - 1] as ApiVersion;

/** Request header selecting a version; every `/v1` response echoes the version it was rendered in. */
export const API_VERSION_HEADER = "Coss-Version";

export const API_VERSION_FORMAT: RegExp = /^\d{4}-\d{2}-\d{2}$/;
