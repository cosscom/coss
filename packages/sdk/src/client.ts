import { type FetchLike, HttpClient } from "./core/http.ts";
import { DomainsResource } from "./resources/domains.ts";
import { EmailResource } from "./resources/email.ts";
import { WebhookEndpointsResource } from "./resources/webhook-endpoints.ts";

export interface CossOptions {
  /** Secret API key (`coss_live_…` or `coss_test_…`). Defaults to the `COSS_API_KEY` env variable. */
  apiKey?: string;
  /** Defaults to the `COSS_BASE_URL` env variable, then `https://api.coss.com`. */
  baseUrl?: string;
  /** Custom `fetch` implementation. Defaults to the global `fetch`. */
  fetch?: FetchLike;
  /** Per-attempt timeout in milliseconds. Default `30000`. */
  timeout?: number;
  /** Retries for connection errors, timeouts, 409, 429 and 5xx responses. Default `2`. */
  maxRetries?: number;
  /**
   * Allow use where a `document` global exists. Off by default because shipping a secret API key
   * to a browser exposes it to anyone who opens the page.
   */
  dangerouslyAllowBrowser?: boolean;
}

const DEFAULT_BASE_URL = "https://api.coss.com";
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RETRIES = 2;
// Timers overflow (and fire immediately) above 2^31-1 ms.
const MAX_TIMEOUT_MS = 2_147_483_647;

/** Reads an env variable where one exists (Node, Bun, Deno's `process`), never throwing. */
function readEnv(name: string): string | undefined {
  try {
    const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process
      ?.env;
    return env?.[name]?.trim() || undefined;
  } catch {
    // e.g. Deno without --allow-env
    return undefined;
  }
}

// Invalid numbers fall back to the defaults: the constructor only throws for missing credentials.
function retries(value: number | undefined): number {
  return value !== undefined && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : DEFAULT_MAX_RETRIES;
}

function timeoutMs(value: number | undefined): number {
  return value !== undefined && Number.isFinite(value) && value > 0
    ? Math.min(Math.ceil(value), MAX_TIMEOUT_MS)
    : DEFAULT_TIMEOUT_MS;
}

/**
 * The COSS client. One API key covers every product.
 *
 * ```ts
 * const coss = new Coss({ apiKey: "coss_test_…" });
 * const { data, error } = await coss.email.send({ from, to, subject, html });
 * ```
 */
export class Coss {
  readonly email: EmailResource;
  /** Sending domains of the organization (`coss.domains.create`, `.verify`, …). */
  readonly domains: DomainsResource;
  /** Webhook endpoints of the API key's environment. */
  readonly webhookEndpoints: WebhookEndpointsResource;

  /**
   * Throws only for programmer errors: no API key, or running in a browser without
   * `dangerouslyAllowBrowser`. Request failures are returned as `{ data: null, error }`.
   */
  constructor(options: CossOptions = {}) {
    if (
      typeof (globalThis as { document?: unknown }).document !== "undefined" &&
      !options.dangerouslyAllowBrowser
    ) {
      throw new Error(
        "Refusing to create a COSS client in a browser-like environment: COSS API keys are secret, " +
          "and any key sent to the browser can be read by anyone using the page. Call COSS from your " +
          "server instead, or pass `dangerouslyAllowBrowser: true` if you understand the risk.",
      );
    }

    const apiKey = options.apiKey?.trim() || readEnv("COSS_API_KEY");
    if (!apiKey) {
      throw new Error(
        "Missing COSS API key. Pass `apiKey` to `new Coss({ apiKey })` or set the COSS_API_KEY " +
          "environment variable.",
      );
    }

    const http = new HttpClient({
      apiKey,
      baseUrl: options.baseUrl?.trim() || readEnv("COSS_BASE_URL") || DEFAULT_BASE_URL,
      // Called through globalThis: a detached `fetch` throws "Illegal invocation" in browsers/Workers.
      fetch: options.fetch ?? ((input, init) => globalThis.fetch(input, init)),
      timeout: timeoutMs(options.timeout),
      maxRetries: retries(options.maxRetries),
    });
    this.email = new EmailResource(http);
    this.domains = new DomainsResource(http);
    this.webhookEndpoints = new WebhookEndpointsResource(http);
  }
}
