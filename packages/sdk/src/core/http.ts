import { VERSION } from "../version.ts";
import { type CossError, type CossResult, clientError, errorFromResponse } from "./errors.ts";

/** Any WHATWG-compatible `fetch` (global fetch, undici, a test double, `app.fetch` adapters …). */
export type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

/** Per-request options accepted by every resource method. */
export interface RequestOptions {
  /**
   * Sent as `Idempotency-Key` on POST requests. When omitted a random UUID is generated; either way
   * the same key is reused for every retry of the call, so a retried send is never duplicated.
   */
  idempotencyKey?: string;
  /** Aborting cancels the in-flight attempt and any pending retry. */
  signal?: AbortSignal;
}

export interface HttpClientOptions {
  apiKey: string;
  baseUrl: string;
  fetch: FetchLike;
  /** Per-attempt timeout in milliseconds. */
  timeout: number;
  maxRetries: number;
  /** Sent as `Coss-Version` with every request. */
  apiVersion: string;
  /** Waits between retries; must resolve early when `signal` aborts. Overridable for tests. */
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
}

export interface ApiRequest {
  /** Disable automatic retries for operations without server-side deduplication. */
  retry?: boolean;
  method: "GET" | "POST" | "PATCH" | "DELETE";
  /** Path including the version prefix, e.g. `/v1/emails`. */
  path: string;
  /** Query parameters; `undefined` values are left out. */
  query?: Record<string, string | number | undefined>;
  /** Serialized as JSON. */
  body?: unknown;
  /**
   * `text` returns the raw body of a successful response (e.g. CSV) instead of parsing JSON;
   * `bytes` returns it as a `Uint8Array` (a received email's raw message, an attachment).
   */
  responseType?: "json" | "text" | "bytes";
  idempotencyKey?: string;
  signal?: AbortSignal;
}

const INITIAL_RETRY_DELAY_MS = 500;
const MAX_RETRY_DELAY_MS = 8_000;
// A server asking us to wait longer than this gets its error returned instead of a stalled call.
const MAX_RETRY_AFTER_MS = 60_000;

interface Attempt<T> {
  result: CossResult<T>;
  retry: boolean;
  retryAfterMs: number | null;
}

/** Exponential backoff (500ms, 1s, 2s … capped at 8s) minus up to 25% random jitter. */
export function backoffDelay(retry: number, random: () => number = Math.random): number {
  const delay = Math.min(INITIAL_RETRY_DELAY_MS * 2 ** retry, MAX_RETRY_DELAY_MS);
  return delay * (1 - random() * 0.25);
}

/** `Retry-After` as milliseconds. Accepts delay-seconds or an HTTP date; `null` if absent/invalid. */
export function parseRetryAfter(value: string | null, now: number = Date.now()): number | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const seconds = Number(trimmed);
  if (Number.isFinite(seconds)) return seconds >= 0 ? seconds * 1000 : null;
  const date = Date.parse(trimmed);
  return Number.isNaN(date) ? null : Math.max(0, date - now);
}

/** 409 (idempotent request still in progress), 429 and 5xx are transient. */
export function isRetryableStatus(status: number): boolean {
  return status === 409 || status === 429 || status >= 500;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    // An already-aborted signal never fires "abort" again, so don't wait for it.
    if (signal?.aborted) {
      resolve();
      return;
    }
    const done = (): void => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", done);
      resolve();
    };
    const timer = setTimeout(done, ms);
    signal?.addEventListener("abort", done, { once: true });
  });
}

/** Error message plus the underlying cause (undici's "fetch failed" hides ECONNREFUSED there). */
function describe(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const cause = error.cause instanceof Error ? error.cause.message : undefined;
  return cause && cause !== error.message ? `${error.message} (${cause})` : error.message;
}

function abortedError(): CossError {
  return clientError("connection_error", "aborted", "The request was aborted.");
}

/**
 * The request pipeline shared by all resources: auth + JSON, a per-attempt timeout, retries with
 * backoff, and mapping every failure to a `CossError`. It never throws for API or network errors.
 */
export class HttpClient {
  readonly #apiKey: string;
  readonly #baseUrl: string;
  readonly #fetch: FetchLike;
  readonly #timeout: number;
  readonly #maxRetries: number;
  readonly #apiVersion: string;
  readonly #sleep: (ms: number, signal?: AbortSignal) => Promise<void>;

  constructor(options: HttpClientOptions) {
    this.#apiKey = options.apiKey;
    this.#baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.#fetch = options.fetch;
    this.#timeout = options.timeout;
    this.#maxRetries = options.maxRetries;
    this.#apiVersion = options.apiVersion;
    this.#sleep = options.sleep ?? sleep;
  }

  async request<T>(request: ApiRequest): Promise<CossResult<T>> {
    let url = `${this.#baseUrl}${request.path}`;
    const query = new URLSearchParams();
    for (const [name, value] of Object.entries(request.query ?? {})) {
      if (value !== undefined) query.set(name, String(value));
    }
    const search = query.toString();
    if (search) url += `?${search}`;
    const headers: Record<string, string> = {
      Accept:
        request.responseType === "text" || request.responseType === "bytes"
          ? "*/*"
          : "application/json",
      Authorization: `Bearer ${this.#apiKey}`,
      "User-Agent": `coss-typescript/${VERSION}`,
      "Coss-Version": this.#apiVersion,
    };
    let body: string | undefined;
    if (request.body !== undefined) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(request.body);
    }
    // Generated once, outside the retry loop: every attempt is the same logical request server-side.
    if (request.method === "POST") {
      headers["Idempotency-Key"] = request.idempotencyKey ?? crypto.randomUUID();
    }
    // Header values must be ByteStrings; fetch would reject e.g. a non-Latin-1 idempotency key with
    // a TypeError that looks like a network failure (and would be retried). Fail fast instead.
    try {
      new Headers(headers);
    } catch (cause) {
      const message = `Invalid request header: ${describe(cause)}`;
      return { data: null, error: clientError("invalid_request_error", "invalid_header", message) };
    }
    const init: RequestInit = { method: request.method, headers, body };

    for (let retry = 0; ; retry++) {
      if (request.signal?.aborted) return { data: null, error: abortedError() };
      const attempt = await this.#attempt<T>(url, init, request.signal, request.responseType);
      if (request.retry === false || !attempt.retry || retry >= this.#maxRetries) {
        return attempt.result;
      }
      const delay = attempt.retryAfterMs ?? backoffDelay(retry);
      if (delay > MAX_RETRY_AFTER_MS) return attempt.result;
      await this.#sleep(delay, request.signal);
    }
  }

  async #attempt<T>(
    url: string,
    init: RequestInit,
    callerSignal: AbortSignal | undefined,
    responseType: ApiRequest["responseType"],
  ): Promise<Attempt<T>> {
    const timeoutSignal = AbortSignal.timeout(this.#timeout);
    const signal = callerSignal ? AbortSignal.any([callerSignal, timeoutSignal]) : timeoutSignal;

    let response: Response;
    let text: string;
    let bytes: Uint8Array | null = null;
    try {
      response = await this.#fetch(url, { ...init, signal });
      // Read the body inside the try: the timeout and the caller's signal cover it too.
      if (responseType === "bytes") {
        bytes = new Uint8Array(await response.arrayBuffer());
        // Only an error's body (the JSON envelope) is read as text.
        text = response.ok ? "" : new TextDecoder().decode(bytes);
      } else {
        text = await response.text();
      }
    } catch (cause) {
      // Check the caller first: an abort is final, while timeouts and network errors are retried.
      if (callerSignal?.aborted) {
        return { result: failed(abortedError()), retry: false, retryAfterMs: null };
      }
      const timeoutMessage = `Request timed out after ${this.#timeout}ms.`;
      const error = timeoutSignal.aborted
        ? clientError("timeout_error", "request_timeout", timeoutMessage)
        : clientError(
            "connection_error",
            "network_error",
            `Could not reach the COSS API at ${this.#baseUrl}: ${describe(cause)}`,
          );
      return { result: failed(error), retry: true, retryAfterMs: null };
    }

    const requestId = response.headers.get("x-request-id");
    if (!response.ok) {
      return {
        result: failed(errorFromResponse(response.status, response.statusText, text, requestId)),
        retry: isRetryableStatus(response.status),
        retryAfterMs: parseRetryAfter(response.headers.get("retry-after")),
      };
    }
    if (responseType === "text") {
      return { result: { data: text as T, error: null }, retry: false, retryAfterMs: null };
    }
    if (responseType === "bytes") {
      return { result: { data: bytes as T, error: null }, retry: false, retryAfterMs: null };
    }
    try {
      return {
        result: { data: JSON.parse(text) as T, error: null },
        retry: false,
        retryAfterMs: null,
      };
    } catch {
      const error: CossError = {
        type: "api_error",
        code: "invalid_response",
        message: `The COSS API returned an HTTP ${response.status} response that is not valid JSON.`,
        status: response.status,
        request_id: requestId,
      };
      return { result: failed(error), retry: false, retryAfterMs: null };
    }
  }
}

function failed<T>(error: CossError): CossResult<T> {
  return { data: null, error };
}
