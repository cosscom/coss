/**
 * A small Twilio REST client on `fetch` (no Twilio SDK): form-encoded requests with basic auth,
 * JSON responses. Server-only.
 */

export const TWILIO_API = "https://api.twilio.com/2010-04-01";
export const TWILIO_MESSAGING = "https://messaging.twilio.com/v1";
export const TWILIO_TRUSTHUB = "https://trusthub.twilio.com/v1";

export type TwilioCredentials = { accountSid: string; authToken: string };

export type TwilioForm = Record<
  string,
  string | readonly string[] | boolean | number | null | undefined
>;

/** Twilio answered with an error (4xx/5xx): `code` is its error code (e.g. 21211), when it gave one. */
export class TwilioApiError extends Error {
  readonly status: number;
  readonly code: string | null;

  constructor(status: number, code: string | null, message: string) {
    super(message);
    this.name = "TwilioApiError";
    this.status = status;
    this.code = code;
  }
}

/** No answer from Twilio (a timeout, a dropped connection): it may or may not have acted. */
export class TwilioNetworkError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "TwilioNetworkError";
  }
}

export type TwilioClient = {
  request<T>(
    method: "GET" | "POST" | "DELETE",
    url: string,
    opts?: { form?: TwilioForm; as?: TwilioCredentials },
  ): Promise<T>;
};

function encodeForm(form: TwilioForm): URLSearchParams {
  const body = new URLSearchParams();
  for (const [name, value] of Object.entries(form)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      for (const item of value) body.append(name, item);
    } else {
      body.append(name, String(value));
    }
  }
  return body;
}

export function createTwilioClient(opts: {
  credentials: TwilioCredentials;
  fetch?: typeof fetch;
  timeoutMs?: number;
}): TwilioClient {
  const doFetch = opts.fetch ?? fetch;
  const timeoutMs = opts.timeoutMs ?? 15_000;
  return {
    async request<T>(
      method: "GET" | "POST" | "DELETE",
      url: string,
      request: { form?: TwilioForm; as?: TwilioCredentials } = {},
    ): Promise<T> {
      const credentials = request.as ?? opts.credentials;
      const basic = btoa(`${credentials.accountSid}:${credentials.authToken}`);
      const body = request.form ? encodeForm(request.form) : undefined;
      let response: Response;
      try {
        response = await doFetch(method === "GET" && body ? `${url}?${body.toString()}` : url, {
          method,
          headers: {
            authorization: `Basic ${basic}`,
            accept: "application/json",
            ...(method !== "GET" && body
              ? { "content-type": "application/x-www-form-urlencoded" }
              : {}),
          },
          body: method !== "GET" && body ? body.toString() : undefined,
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (error) {
        throw new TwilioNetworkError(`Twilio ${method} ${url} got no answer.`, { cause: error });
      }
      if (response.status === 204) return undefined as T;
      const text = await response.text();
      let json: unknown = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        // Not JSON: an HTML error page from an intermediary.
      }
      if (!response.ok) {
        const error = (json ?? {}) as { code?: number | string; message?: string };
        throw new TwilioApiError(
          response.status,
          error.code === undefined ? null : String(error.code),
          error.message ?? `Twilio ${method} ${url} answered ${response.status}.`,
        );
      }
      return json as T;
    },
  };
}
