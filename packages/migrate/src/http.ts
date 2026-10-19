/**
 * The HTTP client every source reads its provider with: JSON, a timeout per attempt, a minimum
 * spacing between requests (providers' rate limits are shared with the customer's own sending, so
 * an import stays well below them), and retries of 429, 5xx and network errors honoring
 * `Retry-After`. A wait longer than `maxWaitMs` is not slept through: it surfaces as a
 * `rate_limited` error with `retryAt`, and the runner comes back then.
 *
 * Errors never carry the key or request headers, only the provider's status and a short excerpt of
 * its message.
 */

export type ProviderErrorCode =
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "rate_limited"
  | "bad_request"
  | "unavailable";

export class ProviderError extends Error {
  constructor(
    readonly code: ProviderErrorCode,
    message: string,
    readonly status: number | null = null,
    /** For `rate_limited`: when to try again. */
    readonly retryAt: Date | null = null,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

export type ProviderFetch = (input: string, init: RequestInit) => Promise<Response>;

export type HttpDeps = {
  fetch?: ProviderFetch | undefined;
  sleep?: ((ms: number) => Promise<void>) | undefined;
  now?: (() => number) | undefined;
};

export type ProviderClientOptions = HttpDeps & {
  /** The provider's name, for error messages. */
  name: string;
  baseUrl: string;
  headers: Record<string, string>;
  /** Minimum time between two requests' starts. */
  minIntervalMs: number;
  timeoutMs?: number | undefined;
  retries?: number | undefined;
  maxWaitMs?: number | undefined;
  /** How long until the provider's rate limit window resets, from a response's headers (ms). */
  resetDelay?: ((headers: Headers, now: number) => number | null) | undefined;
  /** A refusal the provider doesn't send as a 401 (Resend: 400 "API key is invalid"). */
  invalidKey?: ((status: number, message: string) => boolean) | undefined;
};

export type ProviderClient = {
  get<T>(path: string, query?: Record<string, string | number | undefined>): Promise<T>;
  post<T>(path: string, body: unknown): Promise<T>;
};

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_RETRIES = 3;
const DEFAULT_MAX_WAIT_MS = 10_000;
const INITIAL_RETRY_DELAY_MS = 500;
const MESSAGE_EXCERPT = 200;

/** `Retry-After` as milliseconds (delay-seconds or an HTTP date); `null` if absent or invalid. */
export function parseRetryAfter(value: string | null, now: number): number | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const seconds = Number(trimmed);
  if (Number.isFinite(seconds)) return seconds >= 0 ? seconds * 1000 : null;
  const date = Date.parse(trimmed);
  return Number.isNaN(date) ? null : Math.max(0, date - now);
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** The provider's own error message from a JSON or text body, cut short. */
async function messageOf(response: Response): Promise<string> {
  const body = await response.text().catch(() => "");
  let message = body;
  try {
    const json = JSON.parse(body) as Record<string, unknown>;
    const errors = Array.isArray(json.errors) ? (json.errors[0] as Record<string, unknown>) : null;
    const candidate = json.message ?? json.Message ?? errors?.message ?? json.error;
    if (typeof candidate === "string") message = candidate;
  } catch {
    // Not JSON: the text itself.
  }
  const clean = message.replace(/\s+/g, " ").trim();
  return clean.length > MESSAGE_EXCERPT ? `${clean.slice(0, MESSAGE_EXCERPT)}…` : clean;
}

export function providerClient(options: ProviderClientOptions): ProviderClient {
  const fetchFn = options.fetch ?? ((input, init) => fetch(input, init));
  const sleep = options.sleep ?? defaultSleep;
  const now = options.now ?? Date.now;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const retries = options.retries ?? DEFAULT_RETRIES;
  const maxWaitMs = options.maxWaitMs ?? DEFAULT_MAX_WAIT_MS;
  let nextStart = 0;
  // Set when the provider said its window is spent: no request before then.
  let blockedUntil = 0;
  // Requests take turns: each waits for the previous one to start, then for the spacing from
  // that actual start (a timer firing late can't make two requests start together).
  let turns: Promise<void> = Promise.resolve();

  function nextTurn(): Promise<void> {
    const turn = turns.then(async () => {
      await wait(Math.max(nextStart, blockedUntil) - now());
      nextStart = now() + options.minIntervalMs;
    });
    // A turn that gave up (`rate_limited`) still lets the next one go.
    turns = turn.catch(() => {});
    return turn;
  }

  async function wait(ms: number): Promise<void> {
    if (ms <= 0) return;
    if (ms > maxWaitMs) {
      throw new ProviderError(
        "rate_limited",
        `${options.name} asked us to slow down.`,
        429,
        new Date(now() + ms),
      );
    }
    await sleep(ms);
  }

  async function request<T>(method: "GET" | "POST", url: string, body?: unknown): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      await nextTurn();
      let response: Response;
      try {
        response = await fetchFn(url, {
          method,
          headers: {
            accept: "application/json",
            ...(body === undefined ? {} : { "content-type": "application/json" }),
            ...options.headers,
          },
          body: body === undefined ? undefined : JSON.stringify(body),
          redirect: "error",
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (error) {
        if (attempt < retries) {
          await wait(INITIAL_RETRY_DELAY_MS * 2 ** attempt);
          continue;
        }
        const reason =
          error instanceof Error && error.name === "TimeoutError" ? "timed out" : "failed";
        throw new ProviderError("unavailable", `A request to ${options.name} ${reason}.`);
      }
      const reset = options.resetDelay?.(response.headers, now());
      if (reset !== null && reset !== undefined) blockedUntil = now() + reset;
      if (response.ok) {
        if (response.status === 204) return undefined as T;
        try {
          return (await response.json()) as T;
        } catch {
          throw new ProviderError("unavailable", `${options.name} sent an unreadable response.`);
        }
      }
      if (response.status === 429 || response.status >= 500) {
        const retryAfter =
          parseRetryAfter(response.headers.get("retry-after"), now()) ?? reset ?? null;
        if (attempt < retries) {
          await wait(retryAfter ?? INITIAL_RETRY_DELAY_MS * 2 ** attempt);
          continue;
        }
        if (response.status === 429) {
          throw new ProviderError(
            "rate_limited",
            `${options.name} asked us to slow down.`,
            429,
            new Date(now() + (retryAfter ?? 60_000)),
          );
        }
        throw new ProviderError(
          "unavailable",
          `${options.name} answered ${response.status}: ${await messageOf(response)}`,
          response.status,
        );
      }
      const message = await messageOf(response);
      const code: ProviderErrorCode =
        response.status === 401 || options.invalidKey?.(response.status, message)
          ? "unauthorized"
          : response.status === 403
            ? "forbidden"
            : response.status === 404
              ? "not_found"
              : "bad_request";
      throw new ProviderError(
        code,
        `${options.name} answered ${response.status}${message ? `: ${message}` : "."}`,
        response.status,
      );
    }
  }

  function urlOf(path: string, query?: Record<string, string | number | undefined>): string {
    const url = new URL(path, options.baseUrl);
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
    return url.href;
  }

  return {
    get: (path, query) => request("GET", urlOf(path, query)),
    post: (path, body) => request("POST", urlOf(path), body),
  };
}
