// CLI sign-in (`coss login`): PKCE (S256) codes from /app/authorize/cli, exchanged at
// /api/cli/v1/token for a new API key of the environment the user picked. The code only records
// what was approved; the key is created at exchange time, after the dashboard re-checks access.
import { createHash, randomBytes } from "node:crypto";
import { db, schema } from "@coss/db";
import { ID_PREFIXES, newId } from "@coss/db/id";
import { and, eq, gt } from "drizzle-orm";
import {
  AUTHORIZATION_CODE,
  CODE_VERIFIER,
  codeChallengeFor,
  codeIdentifier,
  sameString,
} from "./pkce.ts";

export { isAuthorizationState, isCodeChallenge } from "./pkce.ts";

const { verification } = schema;

/** A code redirected to the CLI's loopback server is exchanged at once. */
export const CLI_CODE_TTL_MS = 60 * 1000;
/** A code the user copies into the terminal (no browser on that machine) gets longer. */
export const CLI_DISPLAY_CODE_TTL_MS = 5 * 60 * 1000;
/** What the CLI names its key: `coss CLI · <host>`, cut to the dashboard's key name limit. */
export const CLI_KEY_NAME_PREFIX = "coss CLI";

const IDENTIFIER_PREFIX = "cli-auth:";

export type CliAuthorization = {
  userId: string;
  organizationId: string;
  organizationSlug: string;
  environmentId: string;
  /** The API key's name. */
  name: string;
  codeChallenge: string;
  /** The approving session's SSO provider: the organization's SSO requirement is re-checked. */
  ssoProviderId: string | null;
};

/** Ports the CLI's loopback server may listen on (never privileged ones). */
export function isLoopbackPort(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1024 && value <= 65535;
}

/**
 * Where the browser hands the code back: the CLI's loopback server, by IP (RFC 8252 §7.3). Built
 * from a port only, never a URL the request supplied.
 */
export function cliCallbackUrl(port: number, params: Record<string, string>): string {
  return `http://127.0.0.1:${port}/callback?${new URLSearchParams(params)}`;
}

/**
 * The short code both the terminal and the approval page show, so the user can tell they approve
 * the request their own terminal started. Derived from the challenge, which both sides know.
 */
export function cliVerificationCode(codeChallenge: string): string {
  const digest = createHash("sha256").update(`coss-cli-verification:${codeChallenge}`).digest();
  // Crockford-style base32 without look-alikes: 8 characters, shown as XXXX-XXXX.
  const alphabet = "ABCDEFGHJKMNPQRSTVWXYZ0123456789";
  let out = "";
  for (let i = 0; i < 8; i++) out += alphabet[(digest[i] ?? 0) % alphabet.length];
  return `${out.slice(0, 4)}-${out.slice(4)}`;
}

export async function createCliAuthorizationCode(
  payload: CliAuthorization,
  opts: { ttlMs: number; now?: Date },
): Promise<string> {
  const now = opts.now ?? new Date();
  const code = randomBytes(32).toString("base64url");
  await db.insert(verification).values({
    id: newId(ID_PREFIXES.verification),
    identifier: codeIdentifier(IDENTIFIER_PREFIX, code),
    value: JSON.stringify(payload),
    expiresAt: new Date(now.getTime() + opts.ttlMs),
  });
  return code;
}

function parsePayload(value: string): CliAuthorization | null {
  try {
    const parsed = JSON.parse(value) as Partial<Record<keyof CliAuthorization, unknown>>;
    const strings = [
      parsed.userId,
      parsed.organizationId,
      parsed.organizationSlug,
      parsed.environmentId,
      parsed.name,
      parsed.codeChallenge,
    ];
    if (!strings.every((field) => typeof field === "string")) return null;
    return {
      userId: parsed.userId as string,
      organizationId: parsed.organizationId as string,
      organizationSlug: parsed.organizationSlug as string,
      environmentId: parsed.environmentId as string,
      name: parsed.name as string,
      codeChallenge: parsed.codeChallenge as string,
      ssoProviderId: typeof parsed.ssoProviderId === "string" ? parsed.ssoProviderId : null,
    };
  } catch {
    return null;
  }
}

/**
 * Consumes a code (single use: one `DELETE … RETURNING`) and checks the verifier. `null` for an
 * unknown, expired or already used code, or a verifier that doesn't match its challenge.
 */
export async function consumeCliAuthorizationCode(
  input: { code: string; codeVerifier: string },
  now = new Date(),
): Promise<CliAuthorization | null> {
  if (!AUTHORIZATION_CODE.test(input.code) || !CODE_VERIFIER.test(input.codeVerifier)) {
    return null;
  }
  const [row] = await db
    .delete(verification)
    .where(
      and(
        eq(verification.identifier, codeIdentifier(IDENTIFIER_PREFIX, input.code)),
        gt(verification.expiresAt, now),
      ),
    )
    .returning({ value: verification.value });
  const payload = row ? parsePayload(row.value) : null;
  if (!payload || !sameString(codeChallengeFor(input.codeVerifier), payload.codeChallenge)) {
    return null;
  }
  return payload;
}
