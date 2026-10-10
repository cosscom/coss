import type { Email, FetchLike } from "../src/index.ts";

/** What the SDK handed to `fetch`, normalized for assertions. */
export interface RecordedCall {
  url: string;
  method: string;
  headers: Headers;
  body: string | null;
  signal: AbortSignal | null;
}

export type Handler = (call: RecordedCall) => Response | Promise<Response>;

/**
 * A fetch double that records calls and answers with `handlers` in order (the last one repeats).
 * Handlers build a fresh Response per call because a body can only be read once.
 */
export function mockFetch(...handlers: Handler[]): { fetch: FetchLike; calls: RecordedCall[] } {
  const calls: RecordedCall[] = [];
  const fetch: FetchLike = async (input, init) => {
    const call: RecordedCall = {
      url: String(input),
      method: init?.method ?? "GET",
      headers: new Headers(init?.headers),
      body: typeof init?.body === "string" ? init.body : null,
      signal: init?.signal ?? null,
    };
    calls.push(call);
    const handler = handlers[Math.min(calls.length, handlers.length) - 1];
    if (!handler) throw new Error("mockFetch: no handler");
    return handler(call);
  };
  return { fetch, calls };
}

export function json(status: number, body: unknown, headers?: Record<string, string>): Handler {
  return () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json", "X-Request-Id": "req_header", ...headers },
    });
}

/** The API's error envelope. */
export function apiError(
  status: number,
  error: { type: string; code: string; message?: string; [key: string]: unknown },
  headers?: Record<string, string>,
): Handler {
  return json(
    status,
    { error: { message: `${error.code} message`, request_id: "req_envelope", ...error } },
    headers,
  );
}

/** Never resolves; rejects with the signal's reason when the SDK aborts it (like real fetch). */
export const hang: Handler = (call) =>
  new Promise<Response>((_, reject) => {
    const signal = call.signal;
    if (!signal) return;
    if (signal.aborted) reject(signal.reason);
    signal.addEventListener("abort", () => reject(signal.reason), { once: true });
  });

export const networkError: Handler = () => {
  throw new TypeError("fetch failed", { cause: new Error("connect ECONNREFUSED 127.0.0.1:3001") });
};

export const sampleEmail: Email = {
  object: "email",
  id: "email_01k5f9yq8re8vb6q2wmz0tb2xd",
  from: "Acme <onboarding@example.com>",
  to: ["delivered@example.com"],
  cc: [],
  bcc: [],
  reply_to: [],
  subject: "Hello",
  html: "<p>Hello</p>",
  text: null,
  headers: {},
  tags: [{ name: "category", value: "welcome" }],
  status: "sent",
  sandbox: true,
  created_at: "2026-10-09T12:00:00.000Z",
  sent_at: "2026-10-09T12:00:00.100Z",
};
