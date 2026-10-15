import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { authorizeUrl, base64url, createPkceRequest, parseCallback } from "../src/lib/pkce";

const RFC_VERIFIER_BYTES = [
  116, 24, 223, 180, 151, 153, 224, 37, 79, 250, 96, 125, 216, 173, 187, 186, 22, 212, 37, 77, 105,
  214, 191, 240, 91, 88, 5, 88, 83, 132, 141, 121,
];

const nodeCrypto = (bytes: number[]) => ({
  randomBytes: (count: number) => Uint8Array.from(bytes.slice(0, count)),
  sha256: async (data: Uint8Array) => new Uint8Array(createHash("sha256").update(data).digest()),
});

describe("PKCE", () => {
  test("base64url matches Node's for every padding length", () => {
    for (const length of [0, 1, 2, 3, 4, 5, 31, 32, 33]) {
      const bytes = Uint8Array.from({ length }, (_, i) => (i * 97 + 13) % 256);
      expect(base64url(bytes)).toBe(Buffer.from(bytes).toString("base64url"));
    }
  });

  test("RFC 7636 appendix B", async () => {
    const request = await createPkceRequest(nodeCrypto(RFC_VERIFIER_BYTES));
    expect(request.verifier).toBe("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk");
    expect(request.challenge).toBe("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
    expect(request.state).toHaveLength(22);
    expect(authorizeUrl("https://coss.com", request)).toBe(
      `https://coss.com/app/authorize?code_challenge=${request.challenge}&state=${request.state}`,
    );
  });

  test("callbacks must carry the state this app sent", () => {
    expect(parseCallback("coss://auth/callback?code=abc&state=s1", "s1")).toEqual({
      kind: "code",
      code: "abc",
    });
    expect(parseCallback("coss://auth/callback?code=abc&state=other", "s1")).toEqual({
      kind: "invalid",
    });
    expect(parseCallback("coss://auth/callback?error=access_denied&state=s1", "s1")).toEqual({
      kind: "denied",
    });
    expect(parseCallback("coss://auth/callback?state=s1", "s1")).toEqual({ kind: "invalid" });
  });
});
