/** One HTTP attempt: send, measure, classify. */
import { DEFAULT_TIMEOUT_MS, type WebhookRequest, type WebhookSender } from "../sender.ts";

const ERROR_MAX_LENGTH = 500;

export type AttemptResult = {
  /** Null when no response arrived. */
  statusCode: number | null;
  responseExcerpt: string | null;
  /** Null exactly when the attempt succeeded (a 2xx response). */
  error: string | null;
  durationMs: number;
  succeeded: boolean;
};

export function describeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.slice(0, ERROR_MAX_LENGTH) || "Request failed.";
}

/** Sends one request; never throws for network failures or non-2xx responses. */
export async function sendAttempt(
  send: WebhookSender,
  request: WebhookRequest,
): Promise<AttemptResult> {
  const started = performance.now();
  let statusCode: number | null = null;
  let responseExcerpt: string | null = null;
  let error: string | null = null;
  try {
    const response = await send({ ...request, timeoutMs: request.timeoutMs ?? DEFAULT_TIMEOUT_MS });
    statusCode = response.status;
    responseExcerpt = response.body || null;
    if (statusCode < 200 || statusCode >= 300) error = `HTTP ${statusCode}`;
  } catch (cause) {
    error = describeError(cause);
  }
  return {
    statusCode,
    responseExcerpt,
    error,
    durationMs: Math.round(performance.now() - started),
    succeeded: error === null,
  };
}
