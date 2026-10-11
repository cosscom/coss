import type { VersionChange } from "./engine.ts";

/**
 * Breaking changes, one entry per change, each tagged with the version that introduced it. Handlers always
 * produce the latest shape; an entry's `responses` transforms rebuild the previous version's shape from it, and its
 * `requests` transforms turn previous-version request bodies into the latest shape. Order doesn't matter across
 * versions; within a version, entries run in this order when downgrading. Every entry is listed in the API
 * changelog (docs) and the dashboard's upgrade dialog.
 */
export const VERSION_CHANGES: readonly VersionChange[] = [];
