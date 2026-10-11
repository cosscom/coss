import { describe, expect, test } from "bun:test";
import { db, schema } from "@coss/db";
import { getReputationStanding } from "@coss/reputation";
import { listScreenings, screenMessage } from "@coss/screening";
import { fakeClassifier } from "@coss/screening/testing";
import { createTestTenant } from "@coss/tenancy/testing";
import { asc, eq } from "drizzle-orm";
import { FakeEmailProvider } from "../src/providers/fake.ts";
import { emailScreeningContent, htmlTextAndLinks } from "../src/screening.ts";
import { createEmailService } from "../src/service.ts";
import { dispatchingEmailService, memoryDispatchQueue } from "../src/testing.ts";
import { params, sendEnvironment, verifiedFrom } from "./helpers.ts";

function screeningService(classifier = fakeClassifier()) {
  const liveProvider = new FakeEmailProvider({ log: false });
  const sandboxProvider = new FakeEmailProvider({ log: false });
  const service = dispatchingEmailService({
    liveProvider,
    sandboxProvider,
    screen: (input) => screenMessage(input, { classifier }),
  });
  return { service, liveProvider, sandboxProvider, classifier };
}

async function eventsOf(emailId: string) {
  return db
    .select()
    .from(schema.emailEvent)
    .where(eq(schema.emailEvent.emailId, emailId))
    .orderBy(asc(schema.emailEvent.createdAt));
}

describe("emailScreeningContent", () => {
  test("extracts visible text, alt text and links from HTML", () => {
    const { text, hrefs } = htmlTextAndLinks(
      `<html><head><title>x</title><style>p{}</style></head><body>
        <p>Your account is <b>locked</b>.</p><script>alert(1)</script>
        <a href="https://evil.example/login?u=1">Unlock now</a><img alt="Bank logo" src="x.png">
      </body></html>`,
    );
    expect(text).toContain("Your account is locked.");
    expect(text).toContain("Unlock now");
    expect(text).toContain("Bank logo");
    expect(text).not.toContain("alert");
    expect(text).not.toContain("p{}");
    expect(hrefs).toEqual(["https://evil.example/login?u=1"]);
  });

  test("includes both body alternatives and merges their links", () => {
    expect(
      emailScreeningContent({
        from: "a@example.com",
        subject: "  Hi  ",
        html: '<p>html body</p><a href="https://one.example/a">x</a>',
        text: "text body https://two.example/b",
      }),
    ).toEqual({
      kind: "email",
      from: "a@example.com",
      subject: "Hi",
      text: "text body https://two.example/b\n\nhtml body\nx",
      links: ["one.example/a", "two.example/b"],
    });
  });

  test.each(["text", "html"] as const)(
    "a long %s part cannot crowd out the other alternative",
    (longPart) => {
      const content = emailScreeningContent({
        from: "a@example.com",
        subject: "Hello",
        text: longPart === "text" ? "x".repeat(20_000) : "Plain message",
        html: longPart === "html" ? `<p>${"x".repeat(20_000)}</p>` : "<p>HTML message</p>",
      });
      expect(content.text).toContain(longPart === "text" ? "HTML message" : "Plain message");
      expect(content.text.length).toBeLessThanOrEqual(8000);
    },
  );

  test("bounds a million-character HTML link before classification", () => {
    const content = emailScreeningContent({
      from: "a@example.com",
      subject: "Hello",
      text: null,
      html: `<a href="https://evil.example/${"x".repeat(1_000_000)}">Open</a>`,
    });
    expect(content.links[0]).toStartWith("evil.example/");
    expect(JSON.stringify(content).length).toBeLessThan(1000);
  });
});

describe("dispatch with content screening", () => {
  test("blocks a confidently malicious live email before the provider and suspends", async () => {
    const tenant = await createTestTenant();
    const { service, liveProvider } = screeningService();
    const { email } = await service.send({
      environment: sendEnvironment(tenant.production),
      apiKeyId: null,
      params: params({
        from: await verifiedFrom(tenant.organization.id),
        subject: "Your mailbox is full [coss-test:phishing]",
      }),
    });

    expect(email).toMatchObject({ status: "failed" });
    expect(liveProvider.sent).toHaveLength(0);
    const [row] = await db.select().from(schema.email).where(eq(schema.email.id, email.id));
    expect(row).toMatchObject({ errorCode: "content_rejected", provider: "fake" });
    const events = await eventsOf(email.id);
    expect(events.map((event) => event.type)).toEqual(["email.failed"]);
    expect(events[0]?.details).toMatchObject({ failure: { code: "content_rejected" } });
    expect((await getReputationStanding(tenant.organization.id))?.status).toBe("suspended");
    const [screening] = await listScreenings(tenant.organization.id);
    expect(screening).toMatchObject({ subjectId: email.id, verdict: "blocked" });
  });

  test("blocks HTML fraud even with a long benign plain-text alternative", async () => {
    const tenant = await createTestTenant();
    const { service, liveProvider, classifier } = screeningService();
    const { email } = await service.send({
      environment: sendEnvironment(tenant.production),
      apiKeyId: null,
      params: params({
        from: await verifiedFrom(tenant.organization.id),
        text: "Your receipt. ".repeat(1000),
        html: "<p>Pay using gift cards [coss-test:fraud]</p>",
      }),
    });
    expect(email.status).toBe("failed");
    expect(liveProvider.sent).toHaveLength(0);
    expect(classifier.calls).toHaveLength(1);
    expect((await listScreenings(tenant.organization.id))[0]?.verdict).toBe("blocked");
    expect((await getReputationStanding(tenant.organization.id))?.status).toBe("suspended");
  });

  test("sends clean and flagged live emails", async () => {
    const tenant = await createTestTenant();
    const { service, liveProvider, classifier } = screeningService();
    const from = await verifiedFrom(tenant.organization.id);
    for (const subject of ["Receipt", "Big sale [coss-test:spam:0.8]"]) {
      const { email } = await service.send({
        environment: sendEnvironment(tenant.production),
        apiKeyId: null,
        params: params({ from, subject }),
      });
      expect(email.status).toBe("sent");
    }
    expect(liveProvider.sent).toHaveLength(2);
    expect(classifier.calls).toHaveLength(2);
    const verdicts = (await listScreenings(tenant.organization.id)).map((s) => s.verdict);
    expect(verdicts.sort()).toEqual(["clean", "flagged"]);
  });

  test("never screens sandbox emails", async () => {
    const tenant = await createTestTenant();
    const { service, sandboxProvider, classifier } = screeningService();
    const { email } = await service.send({
      environment: sendEnvironment(tenant.development),
      apiKeyId: null,
      params: params({ subject: "[coss-test:phishing]" }),
    });
    expect(email.status).toBe("sent");
    expect(sandboxProvider.sent).toHaveLength(1);
    expect(classifier.calls).toHaveLength(0);
  });

  test("fails open when screening itself throws", async () => {
    const tenant = await createTestTenant();
    const liveProvider = new FakeEmailProvider({ log: false });
    const service = dispatchingEmailService({
      liveProvider,
      sandboxProvider: new FakeEmailProvider({ log: false }),
      screen: async () => {
        throw new Error("database unavailable");
      },
    });
    const { email } = await service.send({
      environment: sendEnvironment(tenant.production),
      apiKeyId: null,
      params: params({ from: await verifiedFrom(tenant.organization.id) }),
    });
    expect(email.status).toBe("sent");
    expect(liveProvider.sent).toHaveLength(1);
  });

  test("screens scheduled emails when they are dispatched", async () => {
    const tenant = await createTestTenant();
    const liveProvider = new FakeEmailProvider({ log: false });
    const classifier = fakeClassifier();
    const service = createEmailService({
      liveProvider,
      sandboxProvider: new FakeEmailProvider({ log: false }),
      queue: memoryDispatchQueue(),
      screen: (input) => screenMessage(input, { classifier }),
    });
    const { email } = await service.send({
      environment: sendEnvironment(tenant.production),
      apiKeyId: null,
      params: params({
        from: await verifiedFrom(tenant.organization.id),
        subject: "[coss-test:fraud]",
        scheduled_at: new Date(Date.now() + 3_600_000).toISOString(),
      }),
    });
    expect(classifier.calls).toHaveLength(0);
    const dispatched = await service.dispatchDue({
      now: new Date(Date.now() + 7_200_000),
      scope: { organizationIds: [tenant.organization.id] },
    });
    expect(dispatched).toBe(1);
    expect(classifier.calls).toHaveLength(1);
    const [row] = await db.select().from(schema.email).where(eq(schema.email.id, email.id));
    expect(row).toMatchObject({ status: "failed", errorCode: "content_rejected" });
    expect(liveProvider.sent).toHaveLength(0);
  });
});
