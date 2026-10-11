/**
 * API versions this SDK knows, oldest first: a hand-written mirror of `API_VERSIONS` in the API
 * (`apps/api/test/sdk-contract.test.ts` keeps them equal).
 */
export const API_VERSIONS = ["2026-10-10"] as const;

/** A dated API version, sent as the `Coss-Version` header. */
export type ApiVersion = (typeof API_VERSIONS)[number];

/** The version this SDK's types describe, sent with every request unless `apiVersion` overrides it. */
export const API_VERSION: ApiVersion = "2026-10-10";
