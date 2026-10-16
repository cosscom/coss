/** Posting an event to the local URL, as coss.com would post it to an endpoint. */
import { UsageError } from "../errors.ts";
import type { CliIo } from "../io.ts";
import { VERSION } from "../version.ts";
import { signatureHeaders } from "./sign.ts";

export const FORWARD_TIMEOUT_MS = 10_000;

/**
 * `localhost:3000/webhooks`, `:3000/webhooks` and `3000` all mean
 * `http://localhost:3000/webhooks`; full `http(s)://` URLs are taken as they are.
 */
export function normalizeTarget(input: string): string {
  let value = input.trim();
  if (/^\d+(\/|$)/.test(value)) value = `localhost:${value}`;
  if (value.startsWith(":")) value = `localhost${value}`;
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) value = `http://${value}`;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new UsageError(`--forward-to takes a URL like localhost:3000/webhooks; got "${input}".`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new UsageError("--forward-to takes an http:// or https:// URL.");
  }
  return url.toString();
}

/** `--header "Name: value"`. */
export function parseHeader(input: string): [string, string] {
  const index = input.indexOf(":");
  const name = index > 0 ? input.slice(0, index).trim() : "";
  if (!/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(name)) {
    throw new UsageError(`--header takes "Name: value"; got "${input}".`);
  }
  return [name, input.slice(index + 1).trim()];
}

export type ForwardResult = { statusCode: number | null; durationMs: number; error: string | null };

function describe(error: unknown): string {
  const cause = (error as { cause?: { code?: string } } | null)?.cause;
  const code = cause?.code ?? (error as { code?: string } | null)?.code;
  if (code === "ECONNREFUSED" || code === "ConnectionRefused") return "connection refused";
  if (code === "ENOTFOUND") return "host not found";
  if ((error as Error)?.name === "TimeoutError") {
    return `no answer within ${FORWARD_TIMEOUT_MS / 1000} s`;
  }
  if ((error as Error)?.name === "AbortError") return "interrupted";
  return error instanceof Error ? error.message : String(error);
}

export async function forwardEvent(
  io: CliIo,
  input: {
    url: string;
    secret: string;
    eventId: string;
    body: string;
    headers: [string, string][];
  },
): Promise<ForwardResult> {
  const timestamp = Math.floor(io.now().getTime() / 1000);
  const started = performance.now();
  try {
    const response = await io.fetch(input.url, {
      method: "POST",
      headers: [
        ["content-type", "application/json"],
        ["user-agent", `coss-cli/${VERSION} (coss listen)`],
        ...input.headers,
        ...Object.entries(
          signatureHeaders({
            secret: input.secret,
            id: input.eventId,
            timestamp,
            body: input.body,
          }),
        ),
      ],
      body: input.body,
      redirect: "manual",
      signal: AbortSignal.any([io.signal, AbortSignal.timeout(FORWARD_TIMEOUT_MS)]),
    });
    // The body isn't needed; drain it so the connection can be reused.
    await response.arrayBuffer().catch(() => undefined);
    const durationMs = Math.round(performance.now() - started);
    // A manual redirect can surface as an opaque response without a status.
    if (response.status < 100) return { statusCode: null, durationMs, error: "redirected" };
    return { statusCode: response.status, durationMs, error: null };
  } catch (error) {
    return {
      statusCode: null,
      durationMs: Math.round(performance.now() - started),
      error: describe(error),
    };
  }
}
