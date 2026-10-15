import { describe, expect, test } from "bun:test";
import { providerPicture } from "../src/social.ts";

/** An unsigned JWT with these claims (Better Auth checked the real one's origin). */
function idToken(claims: Record<string, unknown>): string {
  const part = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${part({ alg: "RS256" })}.${part(claims)}.signature`;
}

describe("providerPicture", () => {
  test("GitHub: the avatar URL of the numeric account id", () => {
    expect(providerPicture({ providerId: "github", accountId: "583231" })).toBe(
      "https://avatars.githubusercontent.com/u/583231?v=4",
    );
    expect(providerPicture({ providerId: "github", accountId: "../evil" })).toBeNull();
  });

  test("Google: the id token's https picture", () => {
    const picture = "https://lh3.googleusercontent.com/a/abc=s96-c";
    expect(providerPicture({ providerId: "google", idToken: idToken({ picture }) })).toBe(picture);
    expect(
      providerPicture({ providerId: "google", idToken: idToken({ picture: "http://x.test/a" }) }),
    ).toBeNull();
    expect(providerPicture({ providerId: "google", idToken: idToken({}) })).toBeNull();
    expect(providerPicture({ providerId: "google", idToken: "not-a-jwt" })).toBeNull();
    expect(providerPicture({ providerId: "google", idToken: null })).toBeNull();
  });

  test("nothing for other providers", () => {
    expect(providerPicture({ providerId: "credential", accountId: "1" })).toBeNull();
    expect(
      providerPicture({ providerId: "sso_abc", idToken: idToken({ picture: "https://x" }) }),
    ).toBeNull();
  });
});
