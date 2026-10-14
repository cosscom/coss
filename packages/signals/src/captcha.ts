/**
 * Server-side verification of captcha tokens (Cloudflare Turnstile, hCaptcha): the token a widget
 * gave the user's browser is checked with the provider's `siteverify` endpoint. Throws when the
 * provider can't be reached or answers with an error; a token it rejects is `success: false`.
 */

export type CaptchaProvider = "turnstile" | "hcaptcha";

export const SITEVERIFY_URLS: Record<CaptchaProvider, string> = {
  turnstile: "https://challenges.cloudflare.com/turnstile/v0/siteverify",
  hcaptcha: "https://api.hcaptcha.com/siteverify",
};

export type CaptchaVerdict = {
  success: boolean;
  /** The site the token was issued for. */
  hostname: string | null;
  /** Turnstile's `action` (the widget's `data-action`). */
  action: string | null;
  /** The provider's reasons for refusing (`timeout-or-duplicate`, `invalid-input-response`…). */
  errorCodes: string[];
};

export async function verifyCaptcha(input: {
  provider: CaptchaProvider;
  secret: string;
  token: string;
  /** The user's IP address: providers use it as one more check. */
  remoteIp?: string | null;
  fetch?: typeof fetch;
  signal?: AbortSignal;
}): Promise<CaptchaVerdict> {
  const body = new URLSearchParams({ secret: input.secret, response: input.token });
  if (input.remoteIp) body.set("remoteip", input.remoteIp);
  const response = await (input.fetch ?? fetch)(SITEVERIFY_URLS[input.provider], {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    signal: input.signal,
  });
  if (!response.ok) throw new Error(`${input.provider} siteverify answered ${response.status}`);
  const data = (await response.json()) as {
    success?: unknown;
    hostname?: unknown;
    action?: unknown;
    "error-codes"?: unknown;
  };
  return {
    success: data.success === true,
    hostname: typeof data.hostname === "string" ? data.hostname : null,
    action: typeof data.action === "string" ? data.action : null,
    errorCodes: Array.isArray(data["error-codes"])
      ? data["error-codes"].filter((code): code is string => typeof code === "string")
      : [],
  };
}
