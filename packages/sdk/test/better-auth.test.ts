import { describe, expect, test } from "bun:test";
import { CossSendError, cossEmail, DEFAULT_TEMPLATES } from "../src/better-auth.ts";
import { VERSION } from "../src/index.ts";
import { apiError, json, mockFetch, sampleEmail } from "./helpers.ts";

const API_KEY = "coss_test_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijkl";
const user = { email: "ada@example.com", name: "Ada" };

function setup(options: Partial<Parameters<typeof cossEmail>[0]> = {}) {
  const mock = mockFetch(json(202, sampleEmail));
  const email = cossEmail({
    from: "Acme <auth@acme.com>",
    appName: "Acme",
    apiKey: API_KEY,
    fetch: mock.fetch,
    ...options,
  });
  const sent = () => mock.calls.map((call) => JSON.parse(call.body ?? "null"));
  return { email, calls: mock.calls, sent };
}

describe("cossEmail", () => {
  test("auth emails go out as account mail without tracking", async () => {
    const { email, calls, sent } = setup();
    await email.sendVerificationEmail({ user, url: "https://acme.com/verify?t=1", token: "tok_1" });
    expect(calls[0]?.headers.get("user-agent")).toBe(`coss-typescript/${VERSION} (better-auth)`);
    expect(sent()[0]).toMatchObject({
      from: "Acme <auth@acme.com>",
      to: "ada@example.com",
      subject: "Verify your email address",
      category: "account",
      tracking: { opens: false, clicks: false },
    });
    expect(sent()[0].html).toContain('href="https://acme.com/verify?t=1"');
    expect(sent()[0].text).toContain("https://acme.com/verify?t=1");
  });

  test("a link's token becomes a stable, hashed idempotency key", async () => {
    const { email, calls } = setup();
    await email.sendResetPassword({ user, url: "https://acme.com/r", token: "secret" });
    await email.sendResetPassword({ user, url: "https://acme.com/r", token: "secret" });
    const keys = calls.map((call) => call.headers.get("idempotency-key"));
    expect(keys[0]).toMatch(/^better-auth_[0-9a-f]{64}$/);
    expect(keys[1]).toBe(keys[0]);
    expect(keys[0]).not.toContain("secret");
  });

  test("codes and invitations get a fresh key per send (they can repeat)", async () => {
    const { email, calls } = setup({ invitationUrl: ({ id }) => `https://acme.com/join/${id}` });
    const otp = { email: "ada@example.com", otp: "123456", type: "sign-in" } as const;
    await email.sendVerificationOTP(otp);
    await email.sendVerificationOTP(otp);
    const keys = calls.map((call) => call.headers.get("idempotency-key"));
    expect(keys[0]).not.toBe(keys[1]);
  });

  test("every callback sends to the right address", async () => {
    const { email, sent } = setup({ invitationUrl: ({ id }) => `https://acme.com/join/${id}` });
    await email.sendChangeEmailConfirmation({
      user,
      newEmail: "ada@new.example.com",
      url: "https://acme.com/c",
      token: "t1",
    });
    await email.sendDeleteAccountVerification({ user, url: "https://acme.com/d", token: "t2" });
    await email.sendMagicLink({ email: "bob@example.com", url: "https://acme.com/m", token: "t3" });
    await email.sendVerificationOTP({ email: "eve@example.com", otp: "424242", type: "sign-in" });
    await email.sendInvitationEmail({
      id: "inv_1",
      email: "carol@example.com",
      role: "member",
      organization: { name: "Acme <Labs>" },
      inviter: { user },
    });
    expect(sent().map((body) => [body.to, body.subject])).toEqual([
      ["ada@example.com", "Confirm your new email address"],
      ["ada@example.com", "Confirm account deletion"],
      ["bob@example.com", "Sign in to Acme"],
      ["eve@example.com", "Your sign-in code"],
      ["carol@example.com", "Join Acme <Labs> on Acme"],
    ]);
    expect(sent()[0].text).toContain("ada@new.example.com");
    expect(sent()[3].html).toContain("424242");
    expect(sent()[4].html).toContain("https://acme.com/join/inv_1");
    expect(sent()[4].html).toContain("Acme &lt;Labs&gt;");
    expect(sent()[4].html).not.toContain("<Labs>");
  });

  test("invitations need invitationUrl", async () => {
    const { email, calls } = setup();
    await expect(
      email.sendInvitationEmail({
        id: "inv_1",
        email: "carol@example.com",
        role: "member",
        organization: { name: "Acme" },
        inviter: { user },
      }),
    ).rejects.toThrow(/invitationUrl/);
    expect(calls).toHaveLength(0);
  });

  test("templates can be replaced one at a time", async () => {
    const { email, sent } = setup({
      templates: {
        magicLink: ({ url }) => ({
          subject: "Your link",
          html: `<a href="${url}">Go</a>`,
          text: url,
        }),
      },
    });
    await email.sendMagicLink({ email: "bob@example.com", url: "https://acme.com/m", token: "t" });
    await email.sendResetPassword({ user, url: "https://acme.com/r", token: "t2" });
    expect(sent()[0]).toMatchObject({ subject: "Your link", text: "https://acme.com/m" });
    expect(sent()[1].subject).toBe(
      DEFAULT_TEMPLATES.resetPassword({ user, url: "", token: "", appName: "Acme" }).subject,
    );
  });

  test("send() keeps the defaults but lets the caller override them", async () => {
    const { email, sent } = setup();
    const result = await email.send({
      to: "ada@example.com",
      subject: "Welcome",
      text: "Hi",
      category: "onboarding",
    });
    expect(result.id).toBe(sampleEmail.id);
    expect(sent()[0]).toMatchObject({
      from: "Acme <auth@acme.com>",
      category: "onboarding",
      tracking: { opens: false, clicks: false },
    });
  });

  test("send() also takes a template", async () => {
    const { email, sent } = setup();
    await email.send({ to: "ada@example.com", template_id: "welcome", variables: { name: "Ada" } });
    expect(sent()[0]).toMatchObject({
      from: "Acme <auth@acme.com>",
      template_id: "welcome",
      variables: { name: "Ada" },
      category: "account",
    });
  });

  test("throws CossSendError when coss.com refuses", async () => {
    const mock = mockFetch(
      apiError(403, { type: "permission_error", code: "account_suspended", message: "Suspended." }),
    );
    const email = cossEmail({ from: "auth@acme.com", apiKey: API_KEY, fetch: mock.fetch });
    const error = await email
      .sendVerificationEmail({ user, url: "https://acme.com/v", token: "t" })
      .catch((err: unknown) => err);
    expect(error).toBeInstanceOf(CossSendError);
    expect(error).toMatchObject({ code: "account_suspended", status: 403 });
  });

  test("a missing key fails the first send, not cossEmail()", async () => {
    const saved = process.env.COSS_API_KEY;
    delete process.env.COSS_API_KEY;
    try {
      const email = cossEmail({ from: "auth@acme.com" });
      await expect(
        email.sendMagicLink({ email: "a@example.com", url: "https://x", token: "t" }),
      ).rejects.toThrow(/Missing coss.com API key/);
    } finally {
      if (saved !== undefined) process.env.COSS_API_KEY = saved;
    }
  });
});
