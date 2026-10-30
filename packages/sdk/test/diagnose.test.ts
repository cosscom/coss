import { describe, expect, test } from "bun:test";
import { diagnose, diagnoseEmail, fromDomain, matchDomain } from "../src/diagnose.ts";
import { Coss } from "../src/index.ts";
import { email, event, NOW, recipient } from "./diagnose-fixtures.ts";
import { apiError, json, mockFetch } from "./helpers.ts";

describe("diagnoseEmail", () => {
  test("delivered: every recipient accepted, with the server's response", () => {
    const diagnosis = diagnoseEmail({
      email: email(),
      events: [
        event("email.sent", null),
        event("email.delivered", "ada@example.com", { delivery: { smtp_response: "250 OK" } }),
      ],
      now: NOW,
    });
    expect(diagnosis.verdict).toBe("delivered");
    expect(diagnosis.summary).toBe("Delivered to ada@example.com.");
    expect(diagnosis.recipients[0]).toMatchObject({
      outcome: "delivered",
      details: { smtp_response: "250 OK" },
    });
    expect(diagnosis.warnings).toEqual([]);
    expect(diagnosis.timeline.map((t) => t.type)).toEqual(["email.sent", "email.delivered"]);
  });

  test("a hard bounce names the server's reason and the suppression entry", () => {
    const diagnosis = diagnoseEmail({
      email: email({
        to: ["ada@example.com", "gone@example.com"],
        recipients: [
          recipient("ada@example.com", "delivered"),
          recipient("gone@example.com", "bounced"),
        ],
      }),
      events: [
        event("email.bounced", "gone@example.com", {
          bounce: {
            type: "permanent",
            sub_type: "NoEmail",
            diagnostic_code: "550 5.1.1 user unknown",
          },
        }),
      ],
      context: {
        suppressions: {
          "gone@example.com": [
            {
              object: "suppression",
              id: "sup_1",
              address: "gone@example.com",
              scope: "*",
              reason: "bounce",
              email_id: "email_01k7c8m4q2f3e9v6t5r1n0p8yz",
              subaccount_id: null,
              created_at: "2026-10-15T11:59:03.000Z",
            },
          ],
        },
      },
      now: NOW,
    });
    expect(diagnosis.verdict).toBe("partially_delivered");
    const bounced = diagnosis.recipients[1];
    expect(bounced?.outcome).toBe("bounced");
    expect(bounced?.explanation).toStartWith("Hard bounce");
    expect(bounced?.details).toMatchObject({
      bounce_type: "permanent",
      diagnostic_code: "550 5.1.1 user unknown",
      suppressions: [{ id: "sup_1", reason: "bounce" }],
    });
  });

  test("a soft bounce is not suppressed and can be retried", () => {
    const diagnosis = diagnoseEmail({
      email: email({ recipients: [recipient("ada@example.com", "bounced")] }),
      events: [
        event("email.bounced", "ada@example.com", {
          bounce: { type: "transient", sub_type: "MailboxFull", diagnostic_code: null },
        }),
      ],
      now: NOW,
    });
    expect(diagnosis.verdict).toBe("not_delivered");
    expect(diagnosis.recipients[0]?.explanation).toStartWith("Soft bounce");
    expect(diagnosis.recipients[0]?.next_steps[0]).toContain("Send again later");
  });

  test("all recipients suppressed: the failure is explained with next steps", () => {
    const diagnosis = diagnoseEmail({
      email: email({
        status: "failed",
        sent_at: null,
        failure: {
          code: "all_recipients_suppressed",
          message: "Every recipient is on the suppression list.",
        },
        recipients: [recipient("ada@example.com", "suppressed")],
      }),
      events: [
        event("email.suppressed", "ada@example.com", {
          suppression: { id: "sup_2", scope: "*", reason: "complaint" },
        }),
      ],
      now: NOW,
    });
    expect(diagnosis.verdict).toBe("not_delivered");
    expect(diagnosis.summary).toBe(
      "Not delivered: all_recipients_suppressed — Every recipient is on the suppression list.",
    );
    expect(diagnosis.failure?.next_steps[0]).toContain(
      "(coss.email.suppressions.list({ address }))",
    );
    expect(diagnosis.recipients[0]).toMatchObject({
      outcome: "suppressed",
      details: { matched_suppression: { id: "sup_2", reason: "complaint" } },
    });
    expect(diagnosis.recipients[0]?.explanation).toContain("reason: complaint");
  });

  test("a whole-email failure explains every known code, and falls back for unknown ones", () => {
    for (const code of [
      "domain_not_verified",
      "content_rejected",
      "dispatch_failed",
      "dispatch_interrupted",
      "provider_error",
      "attachments_unavailable",
    ]) {
      const diagnosis = diagnoseEmail({
        email: email({
          status: "failed",
          failure: { code, message: "…" },
          recipients: [recipient("ada@example.com", "failed")],
        }),
        events: [],
        now: NOW,
      });
      expect(diagnosis.failure?.explanation).not.toBe("The email could not be sent.");
      expect(diagnosis.recipients[0]?.outcome).toBe("failed");
      expect(diagnosis.recipients[0]?.explanation).toStartWith("The email failed as a whole");
    }
    const unknown = diagnoseEmail({
      email: email({ status: "failed", failure: { code: "something_new", message: "Nope." } }),
      events: [],
      now: NOW,
    });
    expect(unknown.failure).toMatchObject({
      code: "something_new",
      message: "Nope.",
      explanation: "The email could not be sent.",
    });
  });

  test("queued: fine for a moment, flagged after a few minutes", () => {
    const fresh = diagnoseEmail({
      email: email({
        status: "queued",
        sent_at: null,
        created_at: "2026-10-15T11:59:30.000Z",
        recipients: [recipient("ada@example.com", "queued")],
      }),
      events: [],
      now: NOW,
    });
    expect(fresh.verdict).toBe("in_progress");
    expect(fresh.recipients[0]?.explanation).toContain("in a moment");
    const stuck = diagnoseEmail({
      email: email({
        status: "queued",
        sent_at: null,
        created_at: "2026-10-15T11:30:00.000Z",
        recipients: [recipient("ada@example.com", "queued")],
      }),
      events: [],
      now: NOW,
    });
    expect(stuck.recipients[0]?.explanation).toContain("queued for 30 minutes");
  });

  test("accepted, delayed, complained, scheduled and canceled recipients", () => {
    const sent = diagnoseEmail({
      email: email({ recipients: [recipient("ada@example.com", "sent")] }),
      events: [],
      now: NOW,
    });
    expect(sent.verdict).toBe("in_progress");
    expect(sent.recipients[0]?.explanation).toContain("accepted the email 0 minute(s) ago");

    const delayed = diagnoseEmail({
      email: email({ recipients: [recipient("ada@example.com", "delivery_delayed")] }),
      events: [
        event("email.delivery_delayed", "ada@example.com", {
          delay: { type: "MailboxFull", expires_at: null, diagnostic_code: "452 4.2.2" },
        }),
      ],
      now: NOW,
    });
    expect(delayed.recipients[0]).toMatchObject({
      outcome: "delayed",
      details: { delay: { diagnostic_code: "452 4.2.2" } },
    });

    const complained = diagnoseEmail({
      email: email({ recipients: [recipient("ada@example.com", "complained")] }),
      events: [],
      now: NOW,
    });
    expect(complained.verdict).toBe("delivered");
    expect(complained.recipients[0]?.outcome).toBe("complained");

    const scheduled = diagnoseEmail({
      email: email({
        status: "scheduled",
        sent_at: null,
        scheduled_at: "2026-10-16T09:00:00.000Z",
        recipients: [recipient("ada@example.com", "queued")],
      }),
      events: [],
      now: NOW,
    });
    expect(scheduled.verdict).toBe("scheduled");
    expect(scheduled.summary).toBe("Scheduled for 2026-10-16T09:00:00.000Z; not sent yet.");

    const canceled = diagnoseEmail({
      email: email({ status: "canceled", recipients: [recipient("ada@example.com", "canceled")] }),
      events: [],
      now: NOW,
    });
    expect(canceled.verdict).toBe("canceled");
  });

  test("warnings: sandbox, an unverified From domain, reputation and billing holds", () => {
    expect(
      diagnoseEmail({ email: email({ sandbox: true }), events: [], now: NOW }).warnings[0],
    ).toStartWith("Sandbox email");
    const warnings = diagnoseEmail({
      email: email(),
      events: [],
      context: {
        domain: { name: "acme.com", status: "pending", can_send: false },
        reputation: { status: "warning", reason: "bounce_rate" },
        billing: {
          status: "delinquent",
          holds: [{ reason: "delinquent", since: NOW.toISOString() }],
        },
      },
      now: NOW,
    }).warnings;
    expect(warnings).toHaveLength(3);
    expect(warnings[0]).toContain("acme.com is pending");
    expect(warnings[1]).toContain("bounce_rate");
    expect(warnings[2]).toContain("billing hold (delinquent)");
    expect(
      diagnoseEmail({ email: email(), events: [], context: { domain: null }, now: NOW })
        .warnings[0],
    ).toContain("not a domain of this organization");
  });

  test("opens and clicks stay out of the timeline", () => {
    const diagnosis = diagnoseEmail({
      email: email(),
      events: [event("email.delivered", "ada@example.com"), event("email.opened", null)],
      now: NOW,
    });
    expect(diagnosis.timeline.map((t) => t.type)).toEqual(["email.delivered"]);
  });
});

describe("references", () => {
  test("next steps name the ways to look further as the caller does", () => {
    const failed = email({
      status: "failed",
      failure: { code: "domain_not_verified", message: "acme.com isn't verified." },
      recipients: [recipient("ada@example.com", "failed")],
    });
    const sdk = diagnoseEmail({ email: failed, events: [], now: NOW });
    expect(sdk.failure?.next_steps).toEqual([
      "Check the domain's DNS records and status (coss.domains.list(), coss.domains.get(id)).",
      "Add the missing records, then verify it (coss.domains.verify(id)), and send again.",
    ]);
    const tools = diagnoseEmail({
      email: failed,
      events: [],
      now: NOW,
      references: { list_domains: "list_domains", get_domain: "get_domain" },
    });
    expect(tools.failure?.next_steps[0]).toBe(
      "Check the domain's DNS records and status (list_domains, get_domain).",
    );
    // Unnamed ones keep the SDK's.
    expect(tools.failure?.next_steps[1]).toContain("coss.domains.verify(id)");
  });
});

describe("diagnose", () => {
  const bounced = email({
    from: "Acme <hello@mail.acme.com>",
    recipients: [recipient("gone@example.com", "bounced")],
  });

  test("reads the email, its events and the account context", async () => {
    const { fetch, calls } = mockFetch((call) => {
      const url = new URL(call.url);
      const routes: Record<string, unknown> = {
        [`/v1/emails/${bounced.id}`]: bounced,
        [`/v1/emails/${bounced.id}/events`]: {
          object: "list",
          has_more: false,
          data: [
            event("email.bounced", "gone@example.com", {
              bounce: { type: "permanent", sub_type: "General", diagnostic_code: "550 no user" },
            }),
          ],
        },
        "/v1/suppressions": {
          object: "list",
          has_more: false,
          data: [{ id: "sup_1", scope: "*", reason: "bounce", created_at: NOW.toISOString() }],
        },
        "/v1/domains": {
          object: "list",
          has_more: false,
          data: [{ name: "acme.com", status: "verified", can_send: true }],
        },
        "/v1/reputation": { status: "warning", reason: "bounce_rate" },
      };
      const body = routes[url.pathname];
      return body
        ? json(200, body)(call)
        : apiError(403, { type: "permission_error", code: "forbidden" })(call);
    });
    const coss = new Coss({
      apiKey: "coss_live_x",
      baseUrl: "https://api.coss.test",
      fetch,
      maxRetries: 0,
    });
    const { data, error } = await diagnose(coss, bounced.id, { now: NOW });
    expect(error).toBeNull();
    expect(data?.verdict).toBe("not_delivered");
    expect(data?.recipients[0]?.details).toMatchObject({
      diagnostic_code: "550 no user",
      suppressions: [{ id: "sup_1" }],
    });
    // Billing answered 403: left out, the rest is there.
    expect(data?.warnings).toEqual([
      "The organization's sending reputation has a warning (bounce_rate); bounces and complaints should come down before it is suspended.",
    ]);
    const suppressions = calls.find((call) => call.url.includes("/v1/suppressions"));
    expect(new URL(suppressions?.url ?? "").searchParams.get("address")).toBe("gone@example.com");
  });

  test("an email that can't be read is the error", async () => {
    const { fetch } = mockFetch(apiError(404, { type: "not_found_error", code: "not_found" }));
    const coss = new Coss({
      apiKey: "coss_live_x",
      baseUrl: "https://api.coss.test",
      fetch,
      maxRetries: 0,
    });
    const { data, error } = await diagnose(coss, "email_nope");
    expect(data).toBeNull();
    expect(error?.code).toBe("not_found");
  });
});

describe("domains", () => {
  test("fromDomain reads the address of a From header", () => {
    expect(fromDomain("Acme <Hello@Mail.Acme.com>")).toBe("mail.acme.com");
    expect(fromDomain("hello@acme.com")).toBe("acme.com");
    expect(fromDomain("nobody")).toBeNull();
  });

  test("matchDomain picks the most specific domain", () => {
    const domains = [{ name: "acme.com" }, { name: "mail.acme.com" }, { name: "other.com" }];
    expect(matchDomain(domains, "mail.acme.com")?.name).toBe("mail.acme.com");
    expect(matchDomain(domains, "eu.mail.acme.com")?.name).toBe("mail.acme.com");
    expect(matchDomain(domains, "acme.com")?.name).toBe("acme.com");
    expect(matchDomain(domains, "notacme.com")).toBeNull();
  });
});
