import { describe, expect, mock, test } from "bun:test";
import { createHash } from "node:crypto";

mock.module("server-only", () => ({}));
const { avatarSource, avatarUrl, gravatarUrl } = await import("../src/lib/avatars");

const email = "Jane@Example.com";
const gravatarHash = createHash("sha256").update("jane@example.com").digest("hex");

describe("avatarUrl", () => {
  test("prefers the Google or GitHub picture", () => {
    const google = "https://lh3.googleusercontent.com/a/abc=s96-c";
    const github = "https://avatars.githubusercontent.com/u/1?v=4";
    expect(avatarUrl({ email, emailVerified: true, image: google })).toBe(google);
    expect(avatarSource({ email, emailVerified: true, image: google })).toBe("google");
    expect(avatarUrl({ email, emailVerified: false, image: github })).toBe(github);
    expect(avatarSource({ email, emailVerified: false, image: github })).toBe("github");
  });

  test("falls back to Gravatar for verified addresses only", () => {
    expect(gravatarUrl(` ${email} `)).toBe(
      `https://gravatar.com/avatar/${gravatarHash}?s=96&d=404`,
    );
    expect(avatarUrl({ email, emailVerified: true, image: null })).toBe(gravatarUrl(email));
    expect(avatarSource({ email, emailVerified: true })).toBe("gravatar");
    expect(avatarUrl({ email, emailVerified: false, image: null })).toBeNull();
    expect(avatarSource({ email, emailVerified: false })).toBeNull();
  });

  test("ignores pictures from other hosts (an SSO identity provider's) and plain http", () => {
    for (const image of [
      "https://idp.example.com/me.png",
      "https://avatars.githubusercontent.com.evil.test/u/1",
      "https://evil.test/?h=lh3.googleusercontent.com",
      "http://lh3.googleusercontent.com/a/abc",
      "javascript:alert(1)",
      "not a url",
    ]) {
      expect(avatarUrl({ email, emailVerified: true, image })).toBe(gravatarUrl(email));
    }
  });
});
