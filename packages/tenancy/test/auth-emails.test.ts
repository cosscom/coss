import { afterEach, beforeEach, describe, expect, type Mock, spyOn, test } from "bun:test";
import { auth } from "@coss/auth";
import {
  type AuthEmailMessage,
  enqueueAuthEmail,
  listAuthEmails,
  MAX_AUTH_EMAIL_ATTEMPTS,
  renderAuthEmail,
  runDueAuthEmails,
} from "@coss/auth/emails";
import { db, schema } from "@coss/db";
import { uniqueSuffix } from "@coss/db/testing";
import { eq } from "drizzle-orm";
import { createTestTenant, createTestUser } from "../src/testing.ts";

// Outside production the queued links are also printed; failures are logged.
let info: Mock<typeof console.info>;
let error: Mock<typeof console.error>;
beforeEach(() => {
  info = spyOn(console, "info").mockImplementation(() => {});
  error = spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  info.mockRestore();
  error.mockRestore();
});

function recordingSender(fail?: () => boolean) {
  const sent: AuthEmailMessage[] = [];
  return {
    sent,
    sender: {
      async send(message: AuthEmailMessage) {
        if (fail?.()) throw new Error("provider down");
        sent.push(message);
      },
    },
  };
}

async function sessionHeaders(email: string, password: string): Promise<Headers> {
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

async function signUp(): Promise<{ id: string; email: string }> {
  const email = `signup-${uniqueSuffix()}@coss.test`;
  const { user } = await auth.api.signUpEmail({
    body: { email, password: `pw-${uniqueSuffix()}-not-secret`, name: "New User" },
  });
  return { id: user.id, email: user.email };
}

describe("account emails", () => {
  test("sign-up queues a verification email; the worker sends it once and forgets the link", async () => {
    const user = await signUp();
    const [queued] = await listAuthEmails([user.email]);
    expect(queued).toMatchObject({
      kind: "verify_email",
      to: user.email,
      userId: user.id,
      status: "pending",
    });
    expect(queued?.url).toContain("/verify-email?token=");
    const ttl = (queued?.expiresAt.getTime() ?? 0) - (queued?.createdAt.getTime() ?? 0);
    expect(ttl).toBeGreaterThan(59 * 60 * 1000);
    expect(ttl).toBeLessThanOrEqual(60 * 60 * 1000 + 1000);

    const { sent, sender } = recordingSender();
    const scope = { to: [user.email] };
    expect(await runDueAuthEmails({ scope }, { sender })).toBe(1);
    expect(await runDueAuthEmails({ scope }, { sender })).toBe(0);
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({
      idempotencyKey: queued?.id,
      to: user.email,
      subject: "Verify your email address for coss.com",
    });
    expect(sent[0]?.text).toContain(queued?.url ?? "missing");
    expect(sent[0]?.html).toContain("Verify email address");

    const [settled] = await listAuthEmails([user.email]);
    expect(settled).toMatchObject({ status: "sent", url: null, attemptCount: 1 });
    expect(settled?.sentAt).toBeInstanceOf(Date);

    // The emailed link verifies the address.
    const token = new URL(queued?.url ?? "").searchParams.get("token") ?? "";
    await auth.api.verifyEmail({ query: { token } });
    const [row] = await db
      .select({ emailVerified: schema.user.emailVerified })
      .from(schema.user)
      .where(eq(schema.user.id, user.id));
    expect(row?.emailVerified).toBe(true);
  });

  test("a verification email for an address verified in the meantime is skipped", async () => {
    const user = await signUp();
    await db.update(schema.user).set({ emailVerified: true }).where(eq(schema.user.id, user.id));
    const { sent, sender } = recordingSender();
    await runDueAuthEmails({ scope: { to: [user.email] } }, { sender });
    expect(sent).toHaveLength(0);
    const [row] = await listAuthEmails([user.email]);
    expect(row).toMatchObject({ status: "skipped", lastError: "Already verified.", url: null });
  });

  test("an email for an account that isn't committed yet waits for it, then is skipped", async () => {
    const to = `ghost-${uniqueSuffix()}@coss.test`;
    await enqueueAuthEmail({
      kind: "verify_email",
      to,
      userId: "user_missing",
      url: "https://coss.test/verify-email?token=x",
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });
    const { sent, sender } = recordingSender();
    await runDueAuthEmails({ scope: { to: [to] } }, { sender });
    const [waiting] = await listAuthEmails([to]);
    expect(waiting).toMatchObject({
      status: "pending",
      lastError: "The account does not exist yet.",
    });
    await runDueAuthEmails(
      { now: new Date(Date.now() + 6 * 60 * 1000), scope: { to: [to] } },
      { sender },
    );
    expect(sent).toHaveLength(0);
    const [skipped] = await listAuthEmails([to]);
    expect(skipped).toMatchObject({ status: "skipped", url: null });
  });

  test("a password reset email works after a temporary ban expires, before signing in", async () => {
    const user = await createTestUser();
    await db
      .update(schema.user)
      .set({ banned: true, banExpires: new Date(Date.now() - 60_000) })
      .where(eq(schema.user.id, user.id));
    await auth.api.requestPasswordReset({
      body: { email: user.email, redirectTo: "/reset-password" },
    });
    const { sent, sender } = recordingSender();
    await runDueAuthEmails({ scope: { to: [user.email] } }, { sender });
    expect(sent).toHaveLength(1);
    expect(sent[0]?.subject).toBe("Reset your coss.com password");
    const token = sent[0]?.text.match(/\/reset-password\/([^?\s]+)/)?.[1];
    if (!token) throw new Error("no reset link in the email");
    const newPassword = `new-${uniqueSuffix()}-password`;
    await auth.api.resetPassword({ body: { newPassword, token } });
    expect(await sessionHeaders(user.email, newPassword)).toBeInstanceOf(Headers);
  });

  test.each([
    { label: "permanent", offset: null, status: "skipped" },
    { label: "active temporary", offset: 60_000, status: "skipped" },
    { label: "expiring now", offset: 0, status: "sent" },
  ])("a $label ban leaves a password reset email $status", async ({ offset, status }) => {
    const user = await createTestUser();
    await auth.api.requestPasswordReset({
      body: { email: user.email, redirectTo: "/reset-password" },
    });
    const now = new Date();
    await db
      .update(schema.user)
      .set({ banned: true, banExpires: offset === null ? null : new Date(now.getTime() + offset) })
      .where(eq(schema.user.id, user.id));
    const { sent, sender } = recordingSender();
    await runDueAuthEmails({ now, scope: { to: [user.email] } }, { sender });
    expect(sent).toHaveLength(status === "sent" ? 1 : 0);
    expect((await listAuthEmails([user.email]))[0]).toMatchObject({
      status,
      url: null,
      lastError: status === "skipped" ? "The account is banned." : null,
    });
  });

  test("an email whose link expired before it could be sent is skipped", async () => {
    const user = await createTestUser();
    await auth.api.requestPasswordReset({
      body: { email: user.email, redirectTo: "/reset-password" },
    });
    const { sent, sender } = recordingSender();
    const later = new Date(Date.now() + 61 * 60 * 1000);
    await runDueAuthEmails({ now: later, scope: { to: [user.email] } }, { sender });
    expect(sent).toHaveLength(0);
    const [row] = await listAuthEmails([user.email]);
    expect(row).toMatchObject({ status: "skipped", url: null });
    expect(row?.lastError).toContain("expired");
  });

  test("invitations name the inviter and are skipped once canceled", async () => {
    const tenant = await createTestTenant();
    const headers = await sessionHeaders(tenant.owner.email, tenant.owner.password);
    const invite = (email: string) =>
      auth.api.createInvitation({
        headers,
        body: { email, role: "admin", organizationId: tenant.organization.id },
      });
    const kept = `invitee-${uniqueSuffix()}@coss.test`;
    const canceled = `invitee-${uniqueSuffix()}@coss.test`;
    const invitation = await invite(kept);
    const dropped = await invite(canceled);
    if (!invitation || !dropped) throw new Error("invitation was not created");
    await auth.api.cancelInvitation({ headers, body: { invitationId: dropped.id } });

    const { sent, sender } = recordingSender();
    await runDueAuthEmails({ scope: { to: [kept, canceled] } }, { sender });
    expect(sent.map((message) => message.to)).toEqual([kept]);
    expect(sent[0]?.subject).toBe(`You're invited to join ${tenant.organization.name} on coss.com`);
    expect(sent[0]?.text).toContain(`(${tenant.owner.email}) invited you`);
    expect(sent[0]?.text).toContain("as an admin");
    expect(sent[0]?.text).toContain(`/accept-invitation/${invitation.id}`);
    const [skipped] = await listAuthEmails([canceled]);
    expect(skipped).toMatchObject({
      status: "skipped",
      lastError: "The invitation is no longer pending.",
    });
  });

  test("failures back off, then give up and forget the link", async () => {
    const user = await signUp();
    const { sent, sender } = recordingSender(() => true);
    const scope = { to: [user.email] };
    let now = new Date();
    await runDueAuthEmails({ now, scope }, { sender });
    const [retrying] = await listAuthEmails([user.email]);
    expect(retrying).toMatchObject({ status: "pending", attemptCount: 1 });
    expect(retrying?.lastError).toBe("provider down");
    expect(retrying?.url).not.toBeNull();
    expect(retrying?.nextAttemptAt?.getTime()).toBe(now.getTime() + 60_000);

    // Not due again before its backoff.
    expect(await runDueAuthEmails({ now, scope }, { sender })).toBe(0);
    for (let attempt = 2; attempt <= MAX_AUTH_EMAIL_ATTEMPTS; attempt++) {
      // Keep the link valid while the attempts run out.
      await db
        .update(schema.authEmail)
        .set({ nextAttemptAt: now, expiresAt: new Date(now.getTime() + 60 * 60 * 1000) })
        .where(eq(schema.authEmail.to, user.email));
      expect(await runDueAuthEmails({ now, scope }, { sender })).toBe(1);
      now = new Date(now.getTime() + 1000);
    }
    expect(sent).toHaveLength(0);
    const [failed] = await listAuthEmails([user.email]);
    expect(failed).toMatchObject({
      status: "failed",
      attemptCount: MAX_AUTH_EMAIL_ATTEMPTS,
      nextAttemptAt: null,
      url: null,
    });
  });

  test("concurrent workers send each email once", async () => {
    const user = await signUp();
    const { sent, sender } = recordingSender();
    const scope = { to: [user.email] };
    const claims = await Promise.all([
      runDueAuthEmails({ scope }, { sender }),
      runDueAuthEmails({ scope }, { sender }),
    ]);
    expect(claims.sort()).toEqual([0, 1]);
    expect(sent).toHaveLength(1);
  });
});

describe("renderAuthEmail", () => {
  test("escapes user-chosen names and keeps subjects on one line", () => {
    const message = renderAuthEmail("invitation", {
      to: "invitee@coss.test",
      url: "https://coss.test/accept-invitation/invite_1",
      data: {
        invitationId: "invite_1",
        organizationName: 'Acme\n<b>"Bank"</b>',
        inviterName: "<script>x</script>",
        inviterEmail: "owner@acme.test",
        role: "member",
        expiresAt: "2026-10-13T12:00:00.000Z",
      },
    });
    expect(message.subject).toBe('You\'re invited to join Acme <b>"Bank"</b> on coss.com');
    expect(message.html).not.toContain("<script>");
    expect(message.html).not.toContain("<b>");
    expect(message.html).toContain("&lt;b&gt;&quot;Bank&quot;&lt;/b&gt;");
    expect(message.text).toContain("as a member");
    expect(message.text).toContain("October 13, 2026 at 12:00 PM UTC");
  });
});
