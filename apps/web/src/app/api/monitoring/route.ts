import { sentryConfig } from "@coss/observability";
import { MAX_ENVELOPE_BYTES, tunnelDestination } from "@coss/observability/tunnel";

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
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_ENVELOPE_BYTES) return new Response(null, { status: 413 });
  const envelope = new Uint8Array(await request.arrayBuffer());
  if (envelope.byteLength > MAX_ENVELOPE_BYTES) return new Response(null, { status: 413 });
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
