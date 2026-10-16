import { Coss, INTEGRATION } from "../client.ts";
import type { CossError } from "./errors.ts";
import type { FetchLike } from "./http.ts";

/** How an integration reaches coss.com: a client of your own, or the options to create one. */
export interface IntegrationClientOptions {
  /**
   * A client to send with. When set, `apiKey`, `baseUrl` and `fetch` are ignored. Otherwise the
   * integration creates its own client on first send, so a missing key fails the first send rather
   * than your app's startup (or its build).
   */
  client?: Coss;
  /** Defaults to the `COSS_API_KEY` env variable. */
  apiKey?: string;
  /** Defaults to the `COSS_BASE_URL` env variable, then `https://api.coss.com`. */
  baseUrl?: string;
  fetch?: FetchLike;
}

/** Returns a getter for the client, created (and validated) the first time it is needed. */
export function lazyClient(
  integration: string,
  options: IntegrationClientOptions,
  apiKey?: () => string | undefined,
): () => Coss {
  let client = options.client;
  return () => {
    client ??= new Coss({
      apiKey: apiKey?.() ?? options.apiKey,
      baseUrl: options.baseUrl,
      fetch: options.fetch,
      [INTEGRATION]: integration,
    } as ConstructorParameters<typeof Coss>[0]);
    return client;
  };
}

/**
 * Thrown by the integrations when coss.com refuses or can't take an email. Integrations throw (unlike
 * `coss.email.send`, which returns `{ data, error }`) because the libraries they plug into report
 * failures that way. The API's error is on `error`.
 */
export class CossSendError extends Error {
  override readonly name = "CossSendError";
  /** The `CossError` the API (or the client) returned. */
  readonly error: CossError;
  /** `error.code`, e.g. `domain_not_verified`. */
  readonly code: string;
  /** HTTP status, `null` for connection errors and timeouts. */
  readonly status: number | null;
  /** The API request id (`req_…`) to quote to support. */
  readonly requestId: string | null;

  constructor(error: CossError) {
    const issues = error.issues?.map((issue) => `${issue.path}: ${issue.message}`).join("; ");
    super(
      `coss.com could not send the email: ${error.message} (${error.code})${issues ? ` ${issues}` : ""}`,
    );
    this.error = error;
    this.code = error.code;
    this.status = error.status;
    this.requestId = error.request_id;
  }
}
