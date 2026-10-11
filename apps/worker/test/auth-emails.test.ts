/**
 * End to end: a sign-up queues a verification email, the worker's job sends it as a live email of
 * COSS's own organization, the provider gets the link, and the stored email keeps no body.
 */
import { afterEach, beforeEach, describe, expect, type Mock, spyOn, test } from "bun:test";
import { auth } from "@coss/auth";
import { listAuthEmails, runDueAuthEmails } from "@coss/auth/emails";
import { db, schema } from "@coss/db";
import { uniqueSuffix } from "@coss/db/testing";
import { emailNotifier, FakeEmailProvider, notificationEnvironment } from "@coss/email";
import { createVerifiedDomain, dispatchingEmailService } from "@coss/email/testing";
import { createTestTenant } from "@coss/tenancy/testing";
import { eq } from "drizzle-orm";

// Outside production the dashboard also prints the link.
let info: Mock<typeof console.info>;
beforeEach(() => {
  info = spyOn(console, "info").mockImplementation(() => {});
});
afterEach(() => {
  info.mockRestore();
});

describe("account emails", () => {
  test("a sign-up's verification email goes out through COSS's own organization", async () => {
    const provider = new FakeEmailProvider({ log: false });
    const service = dispatchingEmailService({ liveProvider: provider, sandboxProvider: provider });
    const platform = await createTestTenant();
    const domain = await createVerifiedDomain(platform.organization.id);
    const sender = emailNotifier({
      service,
      environment: await notificationEnvironment(platform.production.id),
      from: `COSS <accounts@${domain.name}>`,
      discardBody: true,
    });

    const to = `signup-${uniqueSuffix()}@coss.test`;
    await auth.api.signUpEmail({
      body: { email: to, password: `pw-${uniqueSuffix()}-not-secret`, name: "New User" },
    });
    const [queued] = await listAuthEmails([to]);
    const link = queued?.url;
    if (!link) throw new Error("no verification email was queued");

    expect(await runDueAuthEmails({ scope: { to: [to] } }, { sender })).toBe(1);
    const delivered = provider.sent.find((message) => message.to.includes(to));
    expect(delivered).toMatchObject({
      organizationId: platform.organization.id,
      subject: "Verify your email address for COSS",
    });
    expect(delivered?.text).toContain(link);

    const [stored] = await db
      .select()
      .from(schema.email)
      .where(eq(schema.email.environmentId, platform.production.id));
    expect(stored).toMatchObject({
      to: [to],
      status: "sent",
      category: "account",
      trackClicks: false,
      html: null,
      text: null,
    });
    expect((await listAuthEmails([to]))[0]).toMatchObject({ status: "sent", url: null });
  });
});
