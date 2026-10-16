import { describe, expect, test } from "bun:test";
import { randomBytes } from "node:crypto";
import { db, schema } from "@coss/db";
import { RETENTION_DAYS } from "@coss/retention";
import { createTestTenant, type TestTenant } from "@coss/tenancy/testing";
import { and, eq } from "drizzle-orm";
import { MAX_TOPICS, UpsertContactRequest } from "../src/contact-schemas.ts";
import { contactCount, getContact, upsertContact } from "../src/contacts.ts";
import { sendConfirmation } from "../src/double-opt-in.ts";
import { EmailError } from "../src/errors.ts";
import {
  confirmationLink,
  DEVELOPMENT_LINK_KEYS,
  linkKeyRing,
  MAX_LINK_TOKEN_LENGTH,
  mintLinkToken,
  preferenceLinks,
  readLinkToken,
} from "../src/link-tokens.ts";
import { applyMarketingFooter } from "../src/marketing-footer.ts";
import { updateMarketingSettings } from "../src/marketing-settings.ts";
import { applyPreferences, confirmContact, loadPreferences } from "../src/preferences.ts";
import { FakeEmailProvider } from "../src/providers/fake.ts";
import { getEmail, listEmailEvents } from "../src/read.ts";
import { purgeExpiredPendingContacts } from "../src/retention.ts";
import {
  CreateEmailTemplateRequest,
  MAX_HEADERS_WITH_UNSUBSCRIBE,
  SendEmailRequest,
} from "../src/schemas.ts";
import type { EmailService } from "../src/service.ts";
import { addSuppression, listSuppressions } from "../src/suppressions.ts";
import { createEmailTemplate, publishTemplateDraft } from "../src/templates.ts";
import { dispatchingEmailService } from "../src/testing.ts";
import { createTopic } from "../src/topics.ts";
import { params, sendEnvironment, verifiedFrom } from "./helpers.ts";

const keys = DEVELOPMENT_LINK_KEYS;
const envOf = (tenant: TestTenant) => ({
  organizationId: tenant.organization.id,
  environmentId: tenant.production.id,
});

describe("link tokens", () => {
  const payload = {
    kind: "preferences" as const,
    environmentId: "env_01k7c8m4q2f3e9v6t5r1n0p8yz",
    address: "ada@example.com",
    emailId: "email_01k7c8m4q2f3e9v6t5r1n0p8yz",
    topic: "news",
  };

  test("round trip, never showing the address", () => {
    const token = mintLinkToken(keys, payload);
    expect(token).not.toContain("ada");
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(readLinkToken(keys, token, "preferences")).toMatchObject({
      environmentId: payload.environmentId,
      address: "ada@example.com",
      emailId: payload.emailId,
      topic: "news",
    });
  });

  test("the longest address and topic still make a link that reads back", () => {
    const longest = {
      ...payload,
      address: `${"\u{1F600}".repeat(60)}${"a".repeat(130)}@${"b".repeat(60)}.com`.slice(0, 254),
      topic: "t".repeat(256),
    };
    const token = mintLinkToken(keys, longest);
    expect(token.length).toBeLessThanOrEqual(MAX_LINK_TOKEN_LENGTH);
    expect(readLinkToken(keys, token, "preferences")?.topic).toBe(longest.topic);
  });

  test("tampering, the other kind, an unknown key and junk all fail", () => {
    const token = mintLinkToken(keys, payload);
    for (let index = 13; index < token.length; index += 7) {
      const flipped = `${token.slice(0, index)}${token[index] === "A" ? "B" : "A"}${token.slice(index + 1)}`;
      expect(readLinkToken(keys, flipped, "preferences")).toBeNull();
    }
    expect(readLinkToken(keys, token, "confirmation")).toBeNull();
    expect(readLinkToken(linkKeyRing([randomBytes(32)]), token, "preferences")).toBeNull();
    expect(readLinkToken(keys, "x".repeat(MAX_LINK_TOKEN_LENGTH + 1), "preferences")).toBeNull();
    expect(readLinkToken(keys, "", "preferences")).toBeNull();
  });

  test("rotation: old links keep working while their key is listed", () => {
    const next = randomBytes(32);
    const old = keys.primary.key;
    const token = mintLinkToken(keys, payload);
    const rotated = linkKeyRing([next, old]);
    expect(readLinkToken(rotated, token, "preferences")?.address).toBe("ada@example.com");
    expect(readLinkToken(rotated, mintLinkToken(rotated, payload), "preferences")).not.toBeNull();
    expect(readLinkToken(linkKeyRing([next]), token, "preferences")).toBeNull();
  });

  test("confirmation links expire after 7 days", () => {
    const url = confirmationLink({
      baseUrl: "https://track.test",
      keys,
      environmentId: payload.environmentId,
      address: "ada@example.com",
      issuedAt: new Date("2026-10-01T00:00:00Z"),
    });
    const token = url.split("/").at(-1) as string;
    expect(
      readLinkToken(keys, token, "confirmation", new Date("2026-10-07T00:00:00Z")),
    ).not.toBeNull();
    expect(readLinkToken(keys, token, "confirmation", new Date("2026-10-09T00:00:00Z"))).toBeNull();
  });

  test("preference links and the RFC 8058 headers", () => {
    const links = preferenceLinks({
      baseUrl: "https://track.test/",
      keys,
      environmentId: payload.environmentId,
      address: "Ada@Example.com",
    });
    expect(links.preferencesUrl).toStartWith("https://track.test/t/u/a");
    expect(links.unsubscribeUrl).toBe(`${links.preferencesUrl}/unsubscribe`);
    expect(links.headers).toEqual({
      "List-Unsubscribe": `<${links.preferencesUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    });
  });
});

describe("the marketing footer", () => {
  const values = {
    unsubscribeUrl: "https://t.test/u?a=1&b=2",
    preferencesUrl: "https://t.test/p",
    mailingAddress: "Acme <Inc>\n1 Main St",
  };

  test("fills placeholders, escaping in HTML", () => {
    const out = applyMarketingFooter(
      {
        html: '<p><a href="{{{unsubscribe_url}}}">Bye</a> {{{mailing_address}}}</p>',
        text: "Bye: {{{unsubscribe_url}}} {{{mailing_address}}}",
      },
      values,
    );
    expect(out.html).toBe(
      '<p><a href="https://t.test/u?a=1&amp;b=2">Bye</a> Acme &lt;Inc&gt;<br>1 Main St</p>',
    );
    expect(out.text).toBe("Bye: https://t.test/u?a=1&b=2 Acme <Inc>\n1 Main St");
  });

  test("adds a footer before </body> with whatever is missing", () => {
    const out = applyMarketingFooter(
      { html: "<html><body><p>Hi</p></BODY></html>", text: "Hi" },
      values,
    );
    expect(out.html).toContain("Acme &lt;Inc&gt;<br>1 Main St");
    expect(out.html).toContain('href="https://t.test/u?a=1&amp;b=2"');
    expect(out.html?.indexOf("Unsubscribe")).toBeLessThan(out.html?.indexOf("</BODY>") ?? 0);
    expect(out.text).toContain("Unsubscribe: https://t.test/u?a=1&b=2");
    expect(out.text).toContain("Acme <Inc>");
  });
});

describe("sending to contacts", () => {
  const provider = new FakeEmailProvider({ log: false });
  const service = dispatchingEmailService({
    liveProvider: provider,
    sandboxProvider: provider,
    trackingBaseUrl: "https://track.test",
  });

  async function fixture() {
    const tenant = await createTestTenant();
    const env = envOf(tenant);
    const from = await verifiedFrom(tenant.organization.id);
    await createTopic(env, { key: "news", name: "News", default_subscription: "opt_in" });
    await updateMarketingSettings(env, { mailing_address: "1 Main St, Springfield" });
    return { tenant, env, from };
  }

  const sent = (emailId: string) => provider.sent.find((message) => message.emailId === emailId);

  test("a transactional topic email skips contacts who opted out, and only them", async () => {
    const { tenant, env, from } = await fixture();
    await upsertContact(
      env,
      UpsertContactRequest.parse({
        email: "out@example.com",
        topics: [{ topic: "news", status: "opted_out" }],
      }),
      { source: "api" },
    );
    // Unsubscribed from marketing: a password reset still reaches them.
    await upsertContact(
      env,
      UpsertContactRequest.parse({ email: "gone@example.com", status: "unsubscribed" }),
      { source: "api" },
    );
    const { email } = await service.send({
      environment: sendEnvironment(tenant.production),
      apiKeyId: null,
      params: params({ from, to: ["out@example.com", "gone@example.com"], category: "news" }),
    });
    const stored = await getEmail({ ...env, id: email.id });
    expect(
      stored?.recipients.map((recipient) => [recipient.address, recipient.status]).sort(),
    ).toEqual([
      ["gone@example.com", "delivered"],
      ["out@example.com", "suppressed"],
    ]);
    // One recipient is left: the unsubscribe header is theirs.
    const header = sent(email.id)?.headers["List-Unsubscribe"] ?? "";
    const token = header.slice(header.lastIndexOf("/") + 1, -1);
    expect(readLinkToken(keys, token, "preferences")).toMatchObject({
      address: "gone@example.com",
      topic: "news",
      emailId: email.id,
    });
  });

  test("a single-recipient topic email gets one-click unsubscribe headers", async () => {
    const { tenant, from } = await fixture();
    const { email } = await service.send({
      environment: sendEnvironment(tenant.production),
      apiKeyId: null,
      params: params({ from, to: ["one@example.com"], category: "news" }),
    });
    const message = sent(email.id);
    expect(message?.headers["List-Unsubscribe"]).toMatch(/^<https:\/\/track\.test\/t\/u\/a.+>$/);
    expect(message?.headers["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
    // The customer's own header wins on transactional email.
    const own = await service.send({
      environment: sendEnvironment(tenant.production),
      apiKeyId: null,
      params: params({
        from,
        to: ["one@example.com"],
        category: "news",
        headers: { "List-Unsubscribe": "<mailto:unsubscribe@example.com>" },
      }),
    });
    expect(sent(own.email.id)?.headers["list-unsubscribe"]).toBe(
      "<mailto:unsubscribe@example.com>",
    );
    expect(sent(own.email.id)?.headers["List-Unsubscribe"]).toBeUndefined();
  });

  test("marketing email: consent, its stream, the footer and the headers", async () => {
    const { tenant, env, from } = await fixture();
    await upsertContact(
      env,
      UpsertContactRequest.parse({ email: "gone@example.com", status: "unsubscribed" }),
      { source: "api" },
    );
    await addSuppression(env, { address: "complained@example.com", scope: "stream:marketing" });
    const marketing = (to: string) =>
      service.send({
        environment: sendEnvironment(tenant.production),
        apiKeyId: null,
        params: params({ from, to: [to], stream: "marketing", html: "<p>Sale!</p>" }),
      });
    const ok = await marketing("fan@example.com");
    const message = sent(ok.email.id);
    expect(message?.stream).toBe("marketing");
    expect(message?.html).toContain("1 Main St, Springfield");
    expect(message?.html).toContain("/unsubscribe");
    expect(message?.headers["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
    // The stored email keeps what was sent to the API.
    expect((await getEmail({ ...env, id: ok.email.id }))?.html).toBe("<p>Sale!</p>");

    for (const address of ["gone@example.com", "complained@example.com"]) {
      const skipped = await marketing(address);
      expect((await getEmail({ ...env, id: skipped.email.id }))?.status).toBe("failed");
    }

    // One recipient listed twice is still one recipient: it gets the footer and headers too.
    const twice = await service.send({
      environment: sendEnvironment(tenant.production),
      apiKeyId: null,
      params: params({
        from,
        to: ["fan@example.com"],
        cc: ["Fan <FAN@example.com>"],
        stream: "marketing",
        html: "<p>Sale!</p>",
      }),
    });
    expect(sent(twice.email.id)?.html).toContain("1 Main St, Springfield");
    expect(sent(twice.email.id)?.headers["List-Unsubscribe-Post"]).toBe(
      "List-Unsubscribe=One-Click",
    );
  });

  test("a stored template's marketing placeholders are filled at dispatch", async () => {
    const { tenant, env, from } = await fixture();
    const live = { organizationId: env.organizationId, environmentId: tenant.production.id };
    const template = await createEmailTemplate(
      live,
      CreateEmailTemplateRequest.parse({
        name: "Newsletter",
        contents: [
          {
            locale: "en",
            subject: "News",
            html: '<p>Hi</p><a href="{{{unsubscribe_url}}}">Leave</a> {{{mailing_address}}}',
          },
        ],
      }),
    );
    await publishTemplateDraft(live, template.id);
    const { email } = await service.send({
      environment: sendEnvironment(tenant.production),
      apiKeyId: null,
      params: params({
        from,
        to: ["fan@example.com"],
        stream: "marketing",
        subject: undefined,
        text: undefined,
        template_id: template.id,
      }),
    });
    const html = sent(email.id)?.html ?? "";
    expect(html).not.toContain("{{{");
    expect(html).toContain("/t/u/");
    expect(html).toContain("1 Main St, Springfield");
  });

  test("marketing needs the postal address, at send and at dispatch", async () => {
    const tenant = await createTestTenant();
    const from = await verifiedFrom(tenant.organization.id);
    const send = () =>
      service.send({
        environment: sendEnvironment(tenant.production),
        apiKeyId: null,
        params: params({ from, to: ["a@example.com"], stream: "marketing" }),
      });
    await expect(send()).rejects.toMatchObject({ code: "mailing_address_required" });

    // Removed after a scheduled send was accepted: the email fails rather than going out bare.
    const env = envOf(tenant);
    await updateMarketingSettings(env, { mailing_address: "1 Main St" });
    const later = new Date(Date.now() + 60 * 60_000);
    const { email } = await service.send({
      environment: sendEnvironment(tenant.production),
      apiKeyId: null,
      params: params({
        from,
        to: ["a@example.com"],
        stream: "marketing",
        scheduled_at: later.toISOString(),
      }),
    });
    await updateMarketingSettings(env, { mailing_address: null });
    await service.dispatchDue({
      now: new Date(later.getTime() + 1000),
      scope: { organizationIds: [tenant.organization.id] },
    });
    const [row] = await db
      .select({ status: schema.email.status, errorCode: schema.email.errorCode })
      .from(schema.email)
      .where(eq(schema.email.id, email.id));
    expect(row).toEqual({ status: "failed", errorCode: "mailing_address_required" });
  });
  test("the preference center replaces per-category one-click unsubscribe on topics and marketing", async () => {
    const { tenant, env, from } = await fixture();
    const send = (overrides: Parameters<typeof params>[0]) =>
      service.send({
        environment: sendEnvironment(tenant.production),
        apiKeyId: null,
        params: params({ from, to: ["one@example.com"], ...overrides }),
      });
    // `news` is a topic: even with `tracking.unsubscribe`, the headers lead to the preference
    // center, so an unsubscribe is the contact's choice, never a suppression.
    const topic = await send({ category: "news", tracking: { unsubscribe: true } });
    const header = sent(topic.email.id)?.headers["List-Unsubscribe"] ?? "";
    expect(header).toMatch(/^<https:\/\/track\.test\/t\/u\/a.+>$/);
    expect(
      readLinkToken(keys, header.slice(header.lastIndexOf("/") + 1, -1), "preferences")?.topic,
    ).toBe("news");
    // Any other category keeps one-click unsubscribe's own link (the email's tracking token).
    const other = await send({ category: "updates", tracking: { unsubscribe: true } });
    expect(sent(other.email.id)?.headers["List-Unsubscribe"]).toMatch(
      /^<https:\/\/track\.test\/t\/u\/[A-Za-z0-9_-]{32}>$/,
    );
    // Marketing email never takes per-category unsubscribe, even when asked.
    const marketing = await send({ stream: "marketing", tracking: { unsubscribe: true } });
    expect((await getEmail({ ...env, id: marketing.email.id }))?.tracking.unsubscribe).toBe(false);
    expect(sent(marketing.email.id)?.headers["List-Unsubscribe"]).toMatch(/\/t\/u\/a.+>$/);
  });

  test("an unsubscribe through an email's link is that email's email.unsubscribed", async () => {
    const { tenant, env, from } = await fixture();
    const { email } = await service.send({
      environment: sendEnvironment(tenant.production),
      apiKeyId: null,
      params: params({ from, to: ["one@example.com"], category: "news" }),
    });
    const header = sent(email.id)?.headers["List-Unsubscribe"] ?? "";
    const link = readLinkToken(keys, header.slice(header.lastIndexOf("/") + 1, -1), "preferences");
    if (!link) throw new Error("expected a preference link");
    expect(await applyPreferences(link, { kind: "unsubscribe" })).toBe(true);
    // Twice: still one event per email.
    expect(await applyPreferences(link, { kind: "unsubscribe" })).toBe(true);
    const events = (await listEmailEvents({ ...env, emailId: email.id }))?.events ?? [];
    expect(events.filter((event) => event.type === "email.unsubscribed")).toHaveLength(1);
    // A topic unsubscribe, not a suppression.
    expect((await listSuppressions(env)).data).toEqual([]);
  });

  test("marketing email leaves room for its two unsubscribe headers", () => {
    const headers = Object.fromEntries(
      Array.from({ length: MAX_HEADERS_WITH_UNSUBSCRIBE + 1 }, (_, i) => [`x-custom-${i}`, "v"]),
    );
    const result = SendEmailRequest.safeParse({
      from: "Acme <news@acme.test>",
      to: "one@example.com",
      subject: "Sale",
      html: "<p>Sale!</p>",
      stream: "marketing",
      headers,
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path.join("."))).toContain("headers");
  });
});

describe("the preference center", () => {
  async function fixture() {
    const tenant = await createTestTenant();
    const env = envOf(tenant);
    await createTopic(env, { key: "news", name: "News", default_subscription: "opt_in" });
    await createTopic(env, { key: "beta", name: "Beta", default_subscription: "opt_out" });
    await createTopic(env, {
      key: "billing",
      name: "Billing",
      default_subscription: "opt_in",
      visibility: "private",
    });
    return { tenant, env };
  }
  const link = (env: ReturnType<typeof envOf>, address: string, topic: string | null = null) => ({
    kind: "preferences" as const,
    environmentId: env.environmentId,
    address,
    emailId: null,
    topic,
    issuedAt: new Date(),
  });

  test("an environment's topics are capped, so the preference form carries them all", async () => {
    const tenant = await createTestTenant();
    const env = envOf(tenant);
    for (let index = 0; index < MAX_TOPICS; index++) {
      await createTopic(env, {
        key: `t${index}`,
        name: `T${index}`,
        default_subscription: "opt_in",
      });
    }
    await expect(
      createTopic(env, { key: "one_more", name: "One more", default_subscription: "opt_in" }),
    ).rejects.toMatchObject({ code: "too_many_topics" });
  });

  test("shows public topics (and the link's own), with the recipient's state", async () => {
    const { env } = await fixture();
    const context = await loadPreferences(link(env, "new@example.com", "billing"));
    expect(context?.status).toBeNull();
    expect(context?.topics.map((topic) => [topic.key, topic.subscribed])).toEqual([
      ["beta", false],
      ["billing", true],
      ["news", true],
    ]);
    expect(context?.linkTopic).toEqual({ key: "billing", name: "Billing" });
  });

  test("one-click leaves the link's topic; without one, marketing altogether", async () => {
    const { env } = await fixture();
    await applyPreferences(link(env, "a@example.com", "news"), { kind: "unsubscribe" });
    // A non-contact became an (unsubscribed) contact, counted but never refused.
    expect(await getContact(env, "a@example.com")).toMatchObject({
      status: "unsubscribed",
      source: "preference_center",
    });
    expect(await contactCount(env)).toBe(1);

    await upsertContact(env, UpsertContactRequest.parse({ email: "b@example.com" }), {
      source: "api",
    });
    await applyPreferences(link(env, "b@example.com", "news"), { kind: "unsubscribe" });
    const topic = await loadPreferences(link(env, "b@example.com"));
    expect(topic?.status).toBe("subscribed");
    expect(topic?.topics.find((t) => t.key === "news")?.subscribed).toBe(false);
    await applyPreferences(link(env, "b@example.com"), { kind: "unsubscribe" });
    expect((await getContact(env, "b@example.com"))?.status).toBe("unsubscribed");
  });

  test("the form saves overall consent and shown topics only", async () => {
    const { env } = await fixture();
    await upsertContact(env, UpsertContactRequest.parse({ email: "c@example.com" }), {
      source: "api",
    });
    await applyPreferences(link(env, "c@example.com"), {
      kind: "save",
      subscribed: true,
      topics: { news: false, beta: true, billing: false },
    });
    const context = await loadPreferences(link(env, "c@example.com", "billing"));
    expect(context?.topics.map((topic) => [topic.key, topic.subscribed])).toEqual([
      ["beta", true],
      // Private and not the link's topic when saved: unchanged.
      ["billing", true],
      ["news", false],
    ]);
  });

  test("a confirmation only confirms a contact still pending since before the link", async () => {
    const { env } = await fixture();
    await upsertContact(env, UpsertContactRequest.parse({ email: "d@example.com" }), {
      source: "api",
      doubleOptIn: true,
    });
    expect((await getContact(env, "d@example.com"))?.status).toBe("pending");
    const confirmation = {
      ...link(env, "d@example.com"),
      kind: "confirmation" as const,
    };
    expect(await confirmContact(confirmation)).toBe("confirmed");
    expect(await getContact(env, "d@example.com")).toMatchObject({ status: "subscribed" });
    expect(await confirmContact(confirmation)).toBe("already_confirmed");

    // Unsubscribed afterwards: the old link can't re-subscribe them.
    await applyPreferences(link(env, "d@example.com"), { kind: "unsubscribe" });
    expect(await confirmContact(confirmation)).toBe("invalid");
    // A new double opt-in starts a new lifecycle; a link from before it does nothing.
    await upsertContact(env, UpsertContactRequest.parse({ email: "d@example.com" }), {
      source: "api",
      doubleOptIn: true,
    });
    expect(await confirmContact({ ...confirmation, issuedAt: new Date(Date.now() - 60_000) })).toBe(
      "invalid",
    );
  });

  test("double opt-in never lets status subscribe a contact directly", async () => {
    const { env } = await fixture();
    await upsertContact(
      env,
      UpsertContactRequest.parse({ email: "g@example.com", status: "unsubscribed" }),
      { source: "api" },
    );
    // The environment's default applies like the flag: the schema can't see it.
    await expect(
      upsertContact(
        env,
        UpsertContactRequest.parse({ email: "g@example.com", status: "subscribed" }),
        { source: "api", doubleOptIn: true },
      ),
    ).rejects.toMatchObject({ code: "double_opt_in_status" });
    expect((await getContact(env, "g@example.com"))?.status).toBe("unsubscribed");
  });

  test("a confirmation keeps a custom subject, and a reused key counts as sent", async () => {
    const { tenant, env } = await fixture();
    await updateMarketingSettings(env, {
      confirmation_from: "news@acme.test",
      confirmation_subject: "Please confirm",
    });
    const { contact } = await upsertContact(
      env,
      UpsertContactRequest.parse({ email: "h@example.com" }),
      { source: "api", doubleOptIn: true },
    );
    const sends: { subject: string | null; html: string | null }[] = [];
    const confirm = (fail: boolean) =>
      sendConfirmation({
        environment: sendEnvironment(tenant.production),
        contactId: contact.id,
        apiKeyId: null,
        linkKeys: keys,
        baseUrl: "https://track.example",
        emailService: {
          async send(input) {
            sends.push(input.params);
            if (fail) throw new EmailError("idempotency_key_reused", "Reused.");
            return {} as Awaited<ReturnType<EmailService["send"]>>;
          },
        },
      });
    expect(await confirm(true)).toBe("sent");
    expect(sends[0]?.subject).toBe("Please confirm");
    expect(sends[0]?.html).toContain("/t/u/confirm/");
    const row = await getContact(env, "h@example.com");
    expect(row?.status).toBe("pending");
    // Recorded: the next one waits for the cooldown.
    expect(await confirm(false)).toBe("cooldown");
  });

  test("unconfirmed contacts are purged after the retention, giving the count back", async () => {
    const { tenant, env } = await fixture();
    await upsertContact(env, UpsertContactRequest.parse({ email: "e@example.com" }), {
      source: "api",
      doubleOptIn: true,
    });
    await upsertContact(env, UpsertContactRequest.parse({ email: "f@example.com" }), {
      source: "api",
    });
    await db
      .update(schema.contact)
      .set({
        pendingSince: new Date(Date.now() - (RETENTION_DAYS.pendingContacts + 1) * 86_400_000),
      })
      .where(
        and(
          eq(schema.contact.environmentId, env.environmentId),
          eq(schema.contact.address, "e@example.com"),
        ),
      );
    const scope = { organizationIds: [tenant.organization.id] };
    expect(await purgeExpiredPendingContacts({ scope })).toBe(1);
    expect(await getContact(env, "e@example.com")).toBeNull();
    expect(await contactCount(env)).toBe(1);

    // Asked again after unsubscribing, and never confirmed: unsubscribed again, not deleted.
    await upsertContact(
      env,
      UpsertContactRequest.parse({ email: "g@example.com", status: "unsubscribed" }),
      { source: "api" },
    );
    await upsertContact(env, UpsertContactRequest.parse({ email: "g@example.com" }), {
      source: "api",
      doubleOptIn: true,
    });
    expect((await getContact(env, "g@example.com"))?.status).toBe("pending");
    await db
      .update(schema.contact)
      .set({
        pendingSince: new Date(Date.now() - (RETENTION_DAYS.pendingContacts + 1) * 86_400_000),
      })
      .where(
        and(
          eq(schema.contact.environmentId, env.environmentId),
          eq(schema.contact.address, "g@example.com"),
        ),
      );
    expect(await purgeExpiredPendingContacts({ scope })).toBe(1);
    expect((await getContact(env, "g@example.com"))?.status).toBe("unsubscribed");
    expect(await contactCount(env)).toBe(2);
  });
});
