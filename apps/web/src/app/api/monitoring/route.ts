import { sentryConfig } from "@coss/observability";
import { MAX_ENVELOPE_BYTES, tunnelDestination } from "@coss/observability/tunnel";
import { rateLimitRuntime } from "@/lib/rate-limit-runtime";

/**
 * Browser monitoring for both zones of coss.com (dashboard and site, same origin): GET hands the
 * browser SDK its configuration (images are built once, so it can't be inlined), POST relays its
 * envelopes to Sentry (`tunnel`). Public (src/proxy.ts) and cheap: no database, no session.
 */
export const dynamic = "force-dynamic";

/** `{ dsn, environment, tracesSampleRate }`, or `{}` while monitoring is off. */
export function GET() {
  const config = sentryConfig(process.env);
  return Response.json(config ?? {}, {
    // Per browser: a deploy that changes it is picked up within minutes.
    headers: { "Cache-Control": "private, max-age=300" },
  });
}

export async function POST(request: Request) {
  const dsn = sentryConfig(process.env)?.dsn;
  if (!dsn) return new Response(null, { status: 204 });
  const rateLimits = rateLimitRuntime();
  const decision = await rateLimits.limiter.consume({
    buckets: ["monitoring.envelopes"],
    // `proxy.ts` replaces this with one trusted address in production. An aggregate fallback
    // still bounds each process when client IP resolution is deliberately disabled.
    subject: rateLimits.clientIp(request.headers) ?? "unattributed",
  });
  if (!decision.allowed) {
    const retryAfter = Math.max(1, Math.ceil((decision.retryAfterMs ?? 60_000) / 1000));
    return new Response(null, {
      status: 429,
      headers: { "Retry-After": String(retryAfter) },
    });
  }
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_ENVELOPE_BYTES) return new Response(null, { status: 413 });
  const reader = request.body?.getReader();
  if (!reader) return new Response(null, { status: 400 });
  // One bounded buffer also avoids retaining arbitrarily many tiny chunks.
  const buffer = new Uint8Array(MAX_ENVELOPE_BYTES);
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value.byteLength > MAX_ENVELOPE_BYTES - size) {
        await reader.cancel().catch(() => {});
        return new Response(null, { status: 413 });
      }
      buffer.set(value, size);
      size += value.byteLength;
    }
  } catch {
    return new Response(null, { status: 400 });
  } finally {
    reader.releaseLock();
  }
  const envelope = buffer.subarray(0, size);
  const destination = tunnelDestination(envelope, dsn);
  if (!destination) return new Response(null, { status: 400 });
  try {
    const upstream = await fetch(destination, {
      method: "POST",
      headers: { "Content-Type": "application/x-sentry-envelope" },
      body: envelope,
      signal: AbortSignal.timeout(5_000),
    });
    // Sentry's status (429 carries Retry-After / X-Sentry-Rate-Limits the SDK honors).
    const headers = new Headers();
    for (const name of ["retry-after", "x-sentry-rate-limits"]) {
      const value = upstream.headers.get(name);
      if (value) headers.set(name, value);
    }
    return new Response(null, { status: upstream.status, headers });
  } catch {
    return new Response(null, { status: 502 });
  }
}
