import { auth } from "@coss/auth";
import { exchangeMobileAuthorizationCode, mobileSessionHeaders } from "@coss/auth/mobile";
import type { TokenResponse } from "@coss/companion";
import { chargeRateLimit, MobileApiError, mobileRoute } from "@/lib/mobile-api";
import { toMobileUser } from "@/lib/mobile-wire";
import { rateLimitRuntime } from "@/lib/rate-limit-runtime";

export const dynamic = "force-dynamic";

async function body(request: Request): Promise<{ code: string; codeVerifier: string }> {
  const json = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (typeof json?.code !== "string" || typeof json.code_verifier !== "string") {
    throw new MobileApiError(400, "invalid_request", "Expected `code` and `code_verifier`.");
  }
  return { code: json.code, codeVerifier: json.code_verifier };
}

export const POST = mobileRoute(async (request): Promise<TokenResponse> => {
  const ipAddress = rateLimitRuntime().clientIp(request.headers);
  // An aggregate fallback still bounds code guessing when client IPs can't be resolved.
  await chargeRateLimit("mobile.token.ip", ipAddress ?? "unattributed");
  const userAgent = request.headers.get("user-agent");
  const result = await exchangeMobileAuthorizationCode({
    ...(await body(request)),
    ipAddress,
    userAgent,
  });
  if (!result) {
    throw new MobileApiError(400, "invalid_grant", "This sign-in link has expired. Try again.");
  }
  const headers = await mobileSessionHeaders(result.token, userAgent);
  const session = headers ? await auth.api.getSession({ headers }) : null;
  if (!session) throw new Error("A new mobile session could not be read back");
  return { token: result.token, user: toMobileUser(session.user) };
});
