import { beforeAll, describe, expect, test } from "bun:test";
import { webcrypto } from "node:crypto";
import { PDFDocument } from "pdf-lib";
import { sealerFromEnv } from "../src/runtime.ts";
import { pkijs, toArrayBuffer } from "../src/seal/crypto.ts";
import { CscSealer, totp } from "../src/seal/csc.ts";
import { readPdfSeal, sealPdf } from "../src/seal/pdf-signature.ts";
import { buildTestPdf } from "../src/testing.ts";
import { type Issued, issue } from "./pki.ts";

let root: Issued;
let leaf: Issued;
let other: Issued;

beforeAll(async () => {
  root = await issue({ commonName: "CSC Test Root", ca: true });
  leaf = await issue({ commonName: "coss.com CSC seal", issuer: root });
  other = await issue({ commonName: "Someone else", issuer: root });
});

const OPTIONS = {
  url: "https://csc.test/csc/v1",
  tokenUrl: "https://login.csc.test/oauth2/token",
  clientId: "client",
  username: "coss",
  password: "password",
  credentialId: "cred-1",
};

/** A CSC service holding `leaf`'s key: records every call and checks the SAD against the hash. */
function cscService(
  opts: {
    authMode?: "implicit" | "explicit";
    /** Signs with this key instead (a credential that doesn't match its certificate). */
    signWith?: Issued;
    /** Answers the first call with this token error. */
    rejectFirstToken?: boolean;
  } = {},
) {
  const calls: { path: string; body: Record<string, unknown> }[] = [];
  let tokens = 0;
  let rejected = false;
  const sads = new Map<string, string>();
  const fetchImpl = (async (input: unknown, init?: RequestInit): Promise<Response> => {
    const url = new URL(String(input));
    if (url.href === OPTIONS.tokenUrl) {
      const form = new URLSearchParams(String(init?.body));
      calls.push({ path: "token", body: Object.fromEntries(form) });
      tokens++;
      return Response.json({
        access_token: `token-${tokens}`,
        token_type: "Bearer",
        expires_in: 3599,
      });
    }
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    const path = url.pathname.replace("/csc/v1/", "");
    calls.push({ path, body });
    const authorization = new Headers(init?.headers).get("authorization");
    if (opts.rejectFirstToken && !rejected) {
      rejected = true;
      return Response.json(
        { error: "invalid_request", error_description: "invalid access token format" },
        { status: 400 },
      );
    }
    if (!authorization?.startsWith("Bearer token-")) return new Response(null, { status: 401 });
    if (path === "credentials/info") {
      return Response.json({
        key: { status: "enabled", algo: ["1.2.840.113549.1.1.11"], len: 2048 },
        cert: {
          status: "valid",
          certificates: [leaf.der, root.der].map((der) => Buffer.from(der).toString("base64")),
        },
        authMode: opts.authMode ?? "implicit",
      });
    }
    if (path === "credentials/authorize") {
      const [hash] = body.hash as string[];
      if (opts.authMode === "explicit" && !body.OTP) {
        return Response.json(
          { error: "invalid_request", error_description: "OTP not present in request" },
          { status: 400 },
        );
      }
      const sad = `sad-${sads.size + 1}`;
      sads.set(sad, hash ?? "");
      return Response.json({ SAD: sad });
    }
    if (path === "signatures/signHash") {
      const [hash] = body.hash as string[];
      if (sads.get(String(body.SAD)) !== hash) {
        return Response.json(
          {
            error: "invalid_request",
            error_description: "hash value(s) in request does not match with value(s) in SAD",
          },
          { status: 400 },
        );
      }
      // PKCS #1 v1.5 over the precomputed hash, as the CA's HSM does.
      const signature = await signDigest(
        (opts.signWith ?? leaf).privateKey,
        Buffer.from(hash ?? "", "base64"),
      );
      return Response.json({ signatures: [Buffer.from(signature).toString("base64")] });
    }
    return new Response(null, { status: 404 });
  }) as typeof fetch;
  return { fetch: fetchImpl, calls };
}

/** RSA PKCS #1 v1.5 over an already computed SHA-256 (what `signHash` does). */
async function signDigest(privateKey: CryptoKey, digest: Buffer): Promise<Uint8Array> {
  const { createPrivateKey, privateEncrypt, constants } = await import("node:crypto");
  const pkcs8 = Buffer.from(await webcrypto.subtle.exportKey("pkcs8", privateKey));
  const digestInfo = Buffer.concat([
    Buffer.from("3031300d060960864801650304020105000420", "hex"),
    digest,
  ]);
  return new Uint8Array(
    privateEncrypt(
      {
        key: createPrivateKey({ key: pkcs8, format: "der", type: "pkcs8" }),
        padding: constants.RSA_PKCS1_PADDING,
      },
      digestInfo,
    ),
  );
}

describe("CSC sealer", () => {
  test("seals: one token, the credential read once, a SAD per hash", async () => {
    const service = cscService();
    const sealer = new CscSealer({ ...OPTIONS, fetch: service.fetch });
    expect(service.calls).toEqual([]);
    const document = await PDFDocument.load(await buildTestPdf());
    const bytes = await sealPdf(document, {
      sealer,
      name: "coss.com",
      reason: "Test",
      signedAt: new Date(),
    });
    // The root is left out of the chain.
    expect(sealer.certificateChain).toEqual([leaf.der]);
    const seal = readPdfSeal(bytes);
    const signedData = new pkijs.SignedData({
      schema: pkijs.ContentInfo.fromBER(toArrayBuffer(seal.cms)).content,
    });
    expect(
      await signedData.verify({
        signer: 0,
        data: toArrayBuffer(seal.signedBytes),
        checkChain: false,
      }),
    ).toBe(true);
    await sealer.sign(new TextEncoder().encode("another"));
    expect(service.calls.map((call) => call.path)).toEqual([
      "token",
      "credentials/info",
      "credentials/authorize",
      "signatures/signHash",
      "credentials/authorize",
      "signatures/signHash",
    ]);
    expect(service.calls[0]?.body).toEqual({
      grant_type: "password",
      client_id: "client",
      username: "coss",
      password: "password",
    });
    expect(service.calls[3]?.body).toMatchObject({
      credentialID: "cred-1",
      hashAlgo: "2.16.840.1.101.3.4.2.1",
      signAlgo: "1.2.840.113549.1.1.11",
    });
    // An eSeal (implicit) sends no OTP.
    expect(service.calls[2]?.body.OTP).toBeUndefined();
  });

  test("an explicit credential gets a TOTP; without its secret it can't seal", async () => {
    const secret = Buffer.from("12345678901234567890").toString("base64");
    const now = new Date("2026-10-29T12:00:00Z");
    const service = cscService({ authMode: "explicit" });
    const sealer = new CscSealer({
      ...OPTIONS,
      totpSecret: secret,
      fetch: service.fetch,
      now: () => now,
    });
    await sealer.sign(new TextEncoder().encode("data"));
    expect(service.calls.find((call) => call.path === "credentials/authorize")?.body.OTP).toBe(
      totp(secret, now),
    );
    const without = new CscSealer({
      ...OPTIONS,
      fetch: cscService({ authMode: "explicit" }).fetch,
    });
    await expect(without.prepare()).rejects.toThrow("TOTP secret");
  });

  test("RFC 6238's test vector (SHA-1, 59 s), as 6 digits", () => {
    const secret = Buffer.from("12345678901234567890").toString("base64");
    expect(totp(secret, new Date(59_000))).toBe("287082");
    expect(totp(secret, new Date(1_111_111_109_000))).toBe("081804");
  });

  test("a rejected token is renewed once (SSL.com answers 400 invalid_request)", async () => {
    const service = cscService({ rejectFirstToken: true });
    const sealer = new CscSealer({ ...OPTIONS, fetch: service.fetch });
    await sealer.prepare();
    expect(service.calls.map((call) => call.path)).toEqual([
      "token",
      "credentials/info",
      "token",
      "credentials/info",
    ]);
  });

  test("a signature that doesn't match the certificate is refused, and the credential re-read", async () => {
    const service = cscService({ signWith: other });
    const sealer = new CscSealer({ ...OPTIONS, fetch: service.fetch });
    await expect(sealer.sign(new TextEncoder().encode("data"))).rejects.toThrow(
      "doesn't match the seal's certificate",
    );
    await expect(sealer.sign(new TextEncoder().encode("data"))).rejects.toThrow();
    expect(service.calls.filter((call) => call.path === "credentials/info")).toHaveLength(2);
  });

  test("sealerFromEnv: csc needs its variables, and calls nothing at start", async () => {
    await expect(sealerFromEnv({ SIGN_SEALER: "csc", SIGN_CSC_URL: OPTIONS.url })).rejects.toThrow(
      "SIGN_SEALER=csc needs",
    );
    const built = await sealerFromEnv({
      SIGN_SEALER: "csc",
      SIGN_CSC_URL: OPTIONS.url,
      SIGN_CSC_TOKEN_URL: OPTIONS.tokenUrl,
      SIGN_CSC_CLIENT_ID: "client",
      SIGN_CSC_USERNAME: "coss",
      SIGN_CSC_PASSWORD: "password",
      SIGN_CSC_CREDENTIAL_ID: "cred-1",
    });
    expect(built?.sealer.name).toBe("csc");
  });
});
