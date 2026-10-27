/**
 * The signing page's JSON API (`/api/sessions/<session id>/…`), used by the page in the browser.
 * Every request carries the session's token as `Authorization: Bearer cosss_…` (never a cookie, so
 * there is nothing to forge cross-site) and acts for that session's one signer. Unknown, expired
 * and wrong-token sessions all get the same 404. Kept free of Next so tests call it directly.
 *
 *   GET  /                  the request as the signer sees it (records `viewed` the first time)
 *   GET  /documents/<id>    a document's PDF, once the signer consented
 *   POST /consent           { disclosure_sha256 }
 *   POST /sign              { values, signature, initials? }
 *   POST /decline           { reason? }
 */

import type { RateLimiter, RateLimitRequest } from "@coss/ratelimit";
import {
  authenticateSignSession,
  consentToSign,
  type DocumentStore,
  declineAsSigner,
  MAX_DECLINE_REASON_LENGTH,
  openSigning,
  readSigningDocument,
  type SignActor,
  SignError,
  signAsSigner,
} from "@coss/sign";
import { z } from "zod";

export type SignApiDeps = {
  /** Documents' bytes; `null` where Sign has no store yet (every request answers 503). */
  store: DocumentStore | null;
  limiter: RateLimiter;
  /** The caller's address (`CLIENT_IP_HEADER`); `null` turns the per-IP limit off. */
  clientIp: string | null;
  now?: Date;
};

class SigningApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

const NOT_FOUND = new SigningApiError(
  404,
  "not_found",
  "This signing link is invalid or has expired.",
);

// Two signature images of at most 512 KB, base64, and the field values.
const MAX_BODY_BYTES = 2 * 1024 * 1024;

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

const ConsentInput = z.strictObject({ disclosure_sha256: z.string().regex(/^[0-9a-f]{64}$/) });
const SignInput = z.strictObject({
  values: z.record(z.string(), z.union([z.string().max(4000), z.boolean()])).default({}),
  signature: z.string().min(1),
  initials: z.string().min(1).nullable().optional(),
});
const DeclineInput = z.strictObject({
  reason: z.string().max(MAX_DECLINE_REASON_LENGTH).nullable().optional(),
});

async function body<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_BODY_BYTES) {
    throw new SigningApiError(413, "payload_too_large", "The request is too large.");
  }
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) {
    throw new SigningApiError(413, "payload_too_large", "The request is too large.");
  }
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SigningApiError(400, "invalid_json", "The body is not valid JSON.");
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new SigningApiError(
      422,
      "validation_error",
      parsed.error.issues[0]?.message ?? "Invalid request.",
    );
  }
  return parsed.data;
}

async function charge(deps: SignApiDeps, requests: RateLimitRequest[]): Promise<void> {
  const charged: RateLimitRequest[] = [];
  for (const request of requests) {
    const decision = await deps.limiter.consume(request);
    if (!decision.allowed) {
      await Promise.all(charged.map((done) => deps.limiter.refund(done)));
      throw new SigningApiError(429, "rate_limited", "Too many requests. Try again in a moment.");
    }
    charged.push(request);
  }
}

/** Answers one signing API request. `path` is what follows `/api/sessions/<id>/`. */
export async function handleSignRequest(
  request: Request,
  sessionId: string,
  path: readonly string[],
  deps: SignApiDeps,
): Promise<Response> {
  try {
    return await route(request, sessionId, path, deps);
  } catch (error) {
    if (error instanceof SigningApiError) {
      return json({ error: { code: error.code, message: error.message } }, error.status);
    }
    if (error instanceof SignError) {
      return json(
        { error: { code: error.code, message: error.message, param: error.param ?? null } },
        error.status,
      );
    }
    console.error(`[sign] ${request.method} ${path.join("/")} failed:`, error);
    return json({ error: { code: "internal_error", message: "Something went wrong." } }, 500);
  }
}

async function route(
  request: Request,
  sessionId: string,
  path: readonly string[],
  deps: SignApiDeps,
): Promise<Response> {
  // Limits first, so a guessed session id or token costs the guesser, not the database.
  await charge(deps, [
    { buckets: ["sign.session"], subject: sessionId },
    ...(deps.clientIp ? [{ buckets: ["sign.ip"], subject: deps.clientIp } as const] : []),
  ]);
  const store = deps.store;
  if (!store) {
    throw new SigningApiError(503, "sign_unavailable", "Signing isn't available yet.");
  }
  const token = /^Bearer (\S+)$/.exec(request.headers.get("authorization") ?? "")?.[1];
  if (!token) throw NOT_FOUND;
  const access = await authenticateSignSession({ id: sessionId, token, now: deps.now });
  if (!access) throw NOT_FOUND;
  const actor: SignActor = {
    kind: "signer",
    ipAddress: deps.clientIp,
    userAgent: request.headers.get("user-agent")?.slice(0, 512) ?? null,
  };
  const now = deps.now;
  const [head, id] = path;
  const method = request.method;

  if (head === undefined && method === "GET") {
    return json(await openSigning(access, { actor, now }));
  }
  if (head === "documents" && id !== undefined && method === "GET") {
    const document = await readSigningDocument(access, { documentId: id, store });
    return new Response(Buffer.from(document.content), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${document.filename.replace(/[^\w.-]/g, "_")}"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }
  if (head === "consent" && id === undefined && method === "POST") {
    const input = await body(request, ConsentInput);
    await consentToSign(access, { disclosureSha256: input.disclosure_sha256, actor, now });
    return json(await openSigning(access, { actor, now }));
  }
  if (head === "sign" && id === undefined && method === "POST") {
    const input = await body(request, SignInput);
    await signAsSigner(access, {
      values: input.values,
      signature: input.signature,
      initials: input.initials ?? null,
      actor,
      store,
      now,
    });
    return json(await openSigning(access, { actor, now }));
  }
  if (head === "decline" && id === undefined && method === "POST") {
    const input = await body(request, DeclineInput);
    await declineAsSigner(access, { reason: input.reason ?? null, actor, now });
    return json(await openSigning(access, { actor, now }));
  }
  throw new SigningApiError(404, "not_found", "No such route.");
}
