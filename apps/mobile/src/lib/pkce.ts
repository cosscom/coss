const BASE64URL = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

export function base64url(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const chunk = ((bytes[i] ?? 0) << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    const chars = Math.min(4, Math.ceil(((bytes.length - i) * 8) / 6));
    for (let j = 0; j < chars; j++) out += BASE64URL[(chunk >> (18 - 6 * j)) & 63];
  }
  return out;
}

export type PkceCrypto = {
  randomBytes(count: number): Uint8Array;
  sha256(data: Uint8Array<ArrayBuffer>): Promise<Uint8Array>;
};

export type PkceRequest = { verifier: string; challenge: string; state: string };

/** RFC 7636 S256: a 32-byte verifier, its SHA-256 challenge, and a CSRF `state`. */
export async function createPkceRequest(crypto: PkceCrypto): Promise<PkceRequest> {
  const verifier = base64url(crypto.randomBytes(32));
  const challenge = base64url(await crypto.sha256(new TextEncoder().encode(verifier)));
  return { verifier, challenge, state: base64url(crypto.randomBytes(16)) };
}

export function authorizeUrl(dashboardUrl: string, request: PkceRequest): string {
  const query = new URLSearchParams({ code_challenge: request.challenge, state: request.state });
  return `${dashboardUrl}/app/authorize?${query}`;
}

export type CallbackResult =
  | { kind: "code"; code: string }
  | { kind: "denied" }
  | { kind: "invalid" };

/** Reads `coss://auth/callback?…`, refusing a `state` that isn't the one this app sent. */
export function parseCallback(url: string, expectedState: string): CallbackResult {
  const query = new URLSearchParams(url.split("?")[1] ?? "");
  if (query.get("state") !== expectedState) return { kind: "invalid" };
  if (query.get("error")) return { kind: "denied" };
  const code = query.get("code");
  return code ? { kind: "code", code } : { kind: "invalid" };
}
