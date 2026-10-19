import { ProviderError } from "../http.ts";
import type { MigrationKind } from "../types.ts";

/**
 * Inventory reads per kind: a kind the key may not read (403) or the account doesn't have (404) is
 * marked unavailable instead of failing the whole inventory; authentication and transient errors
 * still propagate (the runner fails or retries).
 */
export function inventorySections() {
  const unavailable: Partial<Record<MigrationKind, string>> = {};
  async function section<T>(kind: MigrationKind, read: () => Promise<T>, fallback: T): Promise<T> {
    try {
      return await read();
    } catch (error) {
      if (
        error instanceof ProviderError &&
        (error.code === "forbidden" || error.code === "not_found")
      ) {
        unavailable[kind] ??=
          error.code === "forbidden"
            ? "This API key isn't allowed to read them."
            : "The account doesn't offer them.";
        return fallback;
      }
      throw error;
    }
  }
  return { unavailable, section };
}
