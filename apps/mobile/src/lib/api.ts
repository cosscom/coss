import type { MobileErrorBody, MobileErrorCode } from "@coss/companion";

export type ApiError = {
  code: MobileErrorCode | "network_error";
  message: string;
  status: number | null;
  url?: string;
};

export type ApiResult<T> = { data: T; error: null } | { data: null; error: ApiError };

export type ApiClientOptions = {
  baseUrl: string;
  getToken: () => string | null;
  /** The session ended (revoked, expired): forget the token. */
  onUnauthorized: () => void;
  /** Replaces the platform's User-Agent (the dashboard names the session's device by it). */
  userAgent?: string;
  fetch?: typeof fetch;
};

export type ApiClient = <T>(path: string, init?: RequestInit) => Promise<ApiResult<T>>;

function errorFromBody(status: number, body: unknown): ApiError {
  const error = (body as Partial<MobileErrorBody> | null)?.error;
  if (error && typeof error.code === "string" && typeof error.message === "string") {
    return { code: error.code, message: error.message, status, url: error.url };
  }
  return { code: "internal_error", message: `The dashboard answered ${status}.`, status };
}

/** Calls the dashboard's `/api/mobile/v1`. Never throws: failures come back as `error`. */
export function createApiClient(options: ApiClientOptions): ApiClient {
  const fetcher = options.fetch ?? fetch;
  return async <T>(path: string, init: RequestInit = {}): Promise<ApiResult<T>> => {
    const headers = new Headers(init.headers);
    headers.set("accept", "application/json");
    if (init.body) headers.set("content-type", "application/json");
    const token = options.getToken();
    if (token) headers.set("authorization", `Bearer ${token}`);
    if (options.userAgent) headers.set("user-agent", options.userAgent);
    let response: Response;
    try {
      // Cookies would never authenticate this API; don't keep any.
      response = await fetcher(`${options.baseUrl}/api/mobile/v1${path}`, {
        ...init,
        headers,
        credentials: "omit",
      });
    } catch {
      return {
        data: null,
        error: { code: "network_error", message: "Couldn't reach coss.com.", status: null },
      };
    }
    const body: unknown = await response.json().catch(() => null);
    if (response.ok) return { data: body as T, error: null };
    // A late 401 for a credential that was since replaced (sign-out, then sign-in) ends nothing.
    if (response.status === 401 && token && token === options.getToken()) {
      options.onUnauthorized();
    }
    return { data: null, error: errorFromBody(response.status, body) };
  };
}
