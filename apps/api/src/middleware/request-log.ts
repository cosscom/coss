import {
  type LogWriter,
  loggedRequestHeaders,
  loggedResponseHeaders,
  redactBody,
} from "@coss/logs";
import type { RefusedKeyContext } from "@coss/tenancy";
import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../types.ts";

/** Stop reading response bodies for the log once they exceed this byte limit. */
const MAX_LOGGED_RESPONSE_BYTES = 64 * 1024;
const TYPE_ID = /^([a-z][a-z_]*)_[0-7][0-9a-hjkmnp-tv-z]{25}$/;

/** Requests that are not logged: anything outside `/v1`, preflights, and reading the logs. */
function skipped(method: string, path: string): boolean {
  if (!path.startsWith("/v1/")) return true;
  if (method === "OPTIONS") return true;
  return method === "GET" && (path === "/v1/logs" || path.startsWith("/v1/logs/"));
}

type ErrorEnvelope = { error?: { type?: unknown; code?: unknown } };

/** The resource a request is about: the returned object, else the id in the path. */
function resourceOf(
  path: string,
  body: unknown,
): { resourceType: string | null; resourceId: string | null } {
  if (body !== null && typeof body === "object" && !Array.isArray(body)) {
    const { object, id } = body as { object?: unknown; id?: unknown };
    if (typeof object === "string" && object !== "list" && typeof id === "string") {
      return { resourceType: object, resourceId: id };
    }
  }
  for (const segment of path.split("/").reverse()) {
    if (TYPE_ID.test(segment)) return { resourceType: null, resourceId: segment };
  }
  return { resourceType: null, resourceId: null };
}

function parseJson(text: string): unknown {
  try {
    return text.length === 0 ? undefined : JSON.parse(text);
  } catch {
    return undefined;
  }
}

async function readJson(source: Response): Promise<unknown> {
  const reader = source.body?.getReader();
  if (!reader) return undefined;
  try {
    const decoder = new TextDecoder();
    let bytes = 0;
    let text = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) return parseJson(text + decoder.decode());
      bytes += value.byteLength;
      if (bytes > MAX_LOGGED_RESPONSE_BYTES) {
        // A clone's cancellation can wait for the original response to finish. Do not await it.
        void reader.cancel().catch(() => {});
        return undefined;
      }
      text += decoder.decode(value, { stream: true });
    }
  } catch {
    return undefined;
  } finally {
    reader.releaseLock();
  }
}

function isJson(headers: Headers): boolean {
  return headers.get("content-type")?.toLowerCase().includes("json") ?? false;
}

/**
 * Logs every `/v1` request that can be attributed to an environment (an authenticated key, or a
 * valid key refused for its permissions or suspension) as an `api.request` line. Bodies are read
 * after the response is produced and only in redacted form; the write is buffered and never
 * delays or fails the request.
 */
export function requestLog(writer: LogWriter) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const method = c.req.method;
    const path = c.req.path;
    if (skipped(method, path)) return next();

    const started = performance.now();
    const occurredAt = new Date();
    await next();
    const durationMs = performance.now() - started;

    const auth =
      (c.get("auth") as RefusedKeyContext | undefined) ??
      (c.get("attemptedAuth") as RefusedKeyContext | undefined);
    if (!auth) return;

    const response = c.res;
    const status = response.status;
    const route = c.req.routePath.endsWith("*") ? null : c.req.routePath;
    // Only bodies the handler already parsed (no second read of a 40 MB upload); Hono caches
    // what `c.req.json()` read as text.
    const requestText = c.req.bodyCache.text as Promise<string> | undefined;
    const length = Number(response.headers.get("content-length") ?? Number.NaN);
    const responseCopy =
      isJson(response.headers) && !(length > MAX_LOGGED_RESPONSE_BYTES) ? response.clone() : null;
    const requestHeaders = loggedRequestHeaders(c.req.raw.headers);
    const responseHeaders = loggedResponseHeaders(response.headers);
    const { requestId, clientIp } = c.var;
    const search = new URL(c.req.url).search;

    void (async () => {
      const [requestJson, responseJson] = await Promise.all([
        requestText?.then(parseJson, () => undefined),
        responseCopy ? readJson(responseCopy) : undefined,
      ]);
      const error = (responseJson as ErrorEnvelope | undefined)?.error;
      const { resourceType, resourceId } = resourceOf(path, responseJson);
      writer.write({
        organizationId: auth.organizationId,
        projectId: auth.projectId,
        environmentId: auth.environmentId,
        occurredAt,
        source: "api",
        level: status >= 500 ? "error" : status >= 400 ? "warning" : "info",
        type: "api.request",
        message: `${method} ${path} ${status}`,
        requestId,
        apiKeyId: auth.apiKeyId,
        method,
        path,
        route,
        statusCode: status,
        durationMs,
        clientIp,
        userAgent: c.req.header("user-agent") ?? null,
        errorCode: typeof error?.code === "string" ? error.code : null,
        resourceType,
        resourceId,
        attributes: {
          request: {
            ...(search ? { query: search.slice(1) } : {}),
            headers: requestHeaders,
            ...(requestJson === undefined ? {} : { body: redactBody(requestJson) }),
          },
          response: {
            headers: responseHeaders,
            ...(responseJson === undefined ? {} : { body: redactBody(responseJson) }),
          },
          ...(typeof error?.type === "string" ? { error_type: error.type } : {}),
        },
      });
    })().catch((error: unknown) => {
      console.error(`[api] request log failed (request_id=${requestId}):`, error);
    });
  });
}
