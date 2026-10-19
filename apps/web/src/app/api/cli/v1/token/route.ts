import { isSuspended } from "@coss/reputation";
import { createEnvironmentApiKey, redeemCliAuthorization, TenancyError } from "@coss/tenancy";
import { recordUserAudit } from "@/lib/audit";
import { rateLimitRuntime } from "@/lib/rate-limit-runtime";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

/** What `coss login` reads back (snake_case, like the public API). */
type CliTokenResponse = {
  api_key: string;
  api_key_id: string;
  name: string;
  organization_id: string;
  environment_id: string;
};

function refuse(status: number, code: string, message: string, retryAfterS?: number): Response {
  const headers = new Headers(NO_STORE);
  if (retryAfterS) headers.set("Retry-After", String(retryAfterS));
  return Response.json({ error: { code, message } }, { status, headers });
}

/**
 * `coss login`'s code exchange: the one-time code from /app/authorize/cli plus the PKCE verifier
 * only the CLI knows. Access is re-checked now (`redeemCliAuthorization`), then a new key is
 * created for the approved environment and returned once.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const ipAddress = rateLimitRuntime().clientIp(request.headers);
    // An aggregate fallback still bounds code guessing when client IPs can't be resolved.
    const decision = await rateLimitRuntime().limiter.consume({
      buckets: ["cli.token.ip"],
      subject: ipAddress ?? "unattributed",
    });
    if (!decision.allowed) {
      return refuse(
        429,
        "rate_limited",
        "Too many sign-in attempts. Try again shortly.",
        Math.max(1, Math.ceil((decision.retryAfterMs ?? 60_000) / 1000)),
      );
    }
    const json = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (typeof json?.code !== "string" || typeof json.code_verifier !== "string") {
      return refuse(400, "invalid_request", "Expected `code` and `code_verifier`.");
    }
    const redeemed = await redeemCliAuthorization({
      code: json.code,
      codeVerifier: json.code_verifier,
    });
    if (!redeemed.ok) return refuse(400, redeemed.error, redeemed.message);
    const { grant } = redeemed;
    if (grant.environment.mode === "live" && (await isSuspended(grant.organizationId))) {
      return refuse(
        400,
        "access_denied",
        "Live sending is suspended for this organization, so live keys can't be created.",
      );
    }
    const created = await createEnvironmentApiKey({
      organizationId: grant.organizationId,
      environmentId: grant.environment.id,
      name: grant.name,
      userId: grant.user.id,
      // The CLI's commands span products (send, logs, listen): its keys have full access.
      permissions: "full",
    });
    await recordUserAudit(grant.user, {
      organizationId: grant.organizationId,
      action: "api_key.created",
      target: { type: "api_key", id: created.id, label: created.name },
      projectId: grant.environment.projectId,
      environmentId: grant.environment.id,
      metadata: { mode: grant.environment.mode, via: "cli", access: created.access },
    });
    const body: CliTokenResponse = {
      api_key: created.key,
      api_key_id: created.id,
      name: created.name,
      organization_id: grant.organizationId,
      environment_id: grant.environment.id,
    };
    return Response.json(body, { headers: NO_STORE });
  } catch (error) {
    // The key's creation re-checks the organization (suspension) and Better Auth the membership.
    if (error instanceof TenancyError) return refuse(400, "access_denied", error.message);
    console.error("[cli-api] token exchange failed", error);
    return refuse(500, "internal_error", "Something went wrong. Try `coss login` again.");
  }
}
