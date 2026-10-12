import { storeProviderEvent } from "@coss/billing";
import { billingRuntime } from "@/lib/billing";
import { rateLimitRuntime } from "@/lib/rate-limit-runtime";

/**
 * Stripe's webhooks. Public (src/proxy.ts): the signature is the authentication. A verified event
 * is only stored here; the worker applies it (`runDueBillingEvents`), so this answers fast and
 * Stripe's retries of an event we already have are no-ops.
 */
export const dynamic = "force-dynamic";

/** Stripe's events are a few kilobytes; nothing legitimate comes close. */
const MAX_BODY_BYTES = 1024 * 1024;

export async function POST(request: Request) {
  const stripe = billingRuntime().stripe;
  if (!stripe) return new Response(null, { status: 404 });
  const rateLimits = rateLimitRuntime();
  const decision = await rateLimits.limiter.consume({
    buckets: ["billing.webhooks"],
    subject: rateLimits.clientIp(request.headers) ?? "unattributed",
  });
  if (!decision.allowed) {
    const retryAfter = Math.max(1, Math.ceil((decision.retryAfterMs ?? 1_000) / 1000));
    return new Response(null, { status: 429, headers: { "Retry-After": String(retryAfter) } });
  }
  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response(null, { status: 400 });
  const body = await readBounded(request);
  if (body === null) return new Response(null, { status: 413 });

  let event: Awaited<ReturnType<typeof stripe.verifyWebhook>>;
  try {
    event = await stripe.verifyWebhook(body, signature);
  } catch {
    return new Response(null, { status: 400 });
  }
  await storeProviderEvent("stripe", event);
  return Response.json({ received: true });
}

/** The body as text, or `null` past `MAX_BODY_BYTES`. */
async function readBounded(request: Request): Promise<string | null> {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) return null;
  const reader = request.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) {
        await reader.cancel().catch(() => {});
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}
