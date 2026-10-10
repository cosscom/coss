import { afterEach, beforeEach, describe, expect, type Mock, spyOn, test } from "bun:test";
import { auth } from "@coss/auth";
import { uniqueSuffix } from "@coss/db/testing";
import { createTestUser } from "../src/testing.ts";

/** The dev "email" (`logDevEmail`) prints the reset link to the console; capture it instead. */
let info: Mock<typeof console.info>;
beforeEach(() => {
  info = spyOn(console, "info").mockImplementation(() => {});
});
afterEach(() => {
  info.mockRestore();
});

function resetTokenFor(email: string): string | undefined {
  const logged = info.mock.calls.map((args) => String(args[0])).filter((m) => m.includes(email));
  return logged.at(-1)?.match(/\/reset-password\/([^?\s]+)/)?.[1];
}

async function signIn(email: string, password: string): Promise<Headers> {
  const { headers } = await auth.api.signInEmail({
    body: { email, password },
    returnHeaders: true,
  });
  const cookie = headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
  return new Headers({ cookie });
}

describe("password reset", () => {
  test("a reset link sets a new password once and signs out every session", async () => {
    const user = await createTestUser();
    const session = await signIn(user.email, user.password);
    expect(await auth.api.getSession({ headers: session })).not.toBeNull();

    await auth.api.requestPasswordReset({
      body: { email: user.email, redirectTo: "/reset-password" },
    });
    const token = resetTokenFor(user.email);
    if (!token) throw new Error("no reset link was logged");

    const newPassword = `new-${uniqueSuffix()}-password`;
    await auth.api.resetPassword({ body: { newPassword, token } });

    expect(await auth.api.getSession({ headers: session })).toBeNull();
    await expect(signIn(user.email, user.password)).rejects.toThrow();
    expect(await auth.api.getSession({ headers: await signIn(user.email, newPassword) })).not.toBe(
      null,
    );
    await expect(
      auth.api.resetPassword({ body: { newPassword: `again-${uniqueSuffix()}`, token } }),
    ).rejects.toThrow();
  });

  test("the emailed link redirects to the dashboard page with the token, or with an error", async () => {
    const user = await createTestUser();
    await auth.api.requestPasswordReset({
      body: { email: user.email, redirectTo: "/reset-password?next=%2Facme" },
    });
    const token = resetTokenFor(user.email);
    if (!token) throw new Error("no reset link was logged");

    const base = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
    const callbackURL = encodeURIComponent("/reset-password?next=%2Facme");
    const follow = async (t: string) => {
      const response = await auth.handler(
        new Request(`${base}/api/auth/reset-password/${t}?callbackURL=${callbackURL}`),
      );
      expect(response.status).toBe(302);
      return new URL(response.headers.get("location") ?? "");
    };

    const valid = await follow(token);
    expect(valid.pathname).toBe("/reset-password");
    expect(valid.searchParams.get("token")).toBe(token);
    expect(valid.searchParams.get("next")).toBe("/acme");

    const invalid = await follow("not-a-real-token");
    expect(invalid.pathname).toBe("/reset-password");
    expect(invalid.searchParams.get("error")).toBe("INVALID_TOKEN");
    expect(invalid.searchParams.has("token")).toBe(false);
  });

  test("unknown emails get the same answer and no link", async () => {
    const email = `nobody-${uniqueSuffix()}@coss.test`;
    const known = await createTestUser();
    const answer = (address: string) =>
      auth.api.requestPasswordReset({ body: { email: address, redirectTo: "/reset-password" } });
    expect(await answer(email)).toEqual(await answer(known.email));
    expect(resetTokenFor(email)).toBeUndefined();
  });

  test("passwords shorter than 8 characters are rejected and keep the token usable", async () => {
    const user = await createTestUser();
    await auth.api.requestPasswordReset({
      body: { email: user.email, redirectTo: "/reset-password" },
    });
    const token = resetTokenFor(user.email);
    if (!token) throw new Error("no reset link was logged");

    await expect(
      auth.api.resetPassword({ body: { newPassword: "short", token } }),
    ).rejects.toThrow();
    await auth.api.resetPassword({ body: { newPassword: `long-enough-${uniqueSuffix()}`, token } });
  });
});
