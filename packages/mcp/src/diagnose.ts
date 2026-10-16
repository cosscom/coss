/**
 * Turns an email, its events and some account context into a plain-language delivery verdict:
 * what happened to each recipient, why, and what to do about it. Pure: tools fetch, this decides.
 */
import type {
  Email,
  EmailEvent,
  EmailRecipient,
  EmailSummary,
  ReputationStatus,
  Suppression,
} from "coss";

export type RecipientOutcome =
  | "delivered"
  | "in_progress"
  | "delayed"
  | "bounced"
  | "complained"
  | "suppressed"
  | "failed"
  | "scheduled"
  | "canceled";

export type Verdict =
  | "delivered"
  | "partially_delivered"
  | "in_progress"
  | "scheduled"
  | "canceled"
  | "not_delivered";

export interface RecipientDiagnosis {
  address: string;
  type: EmailRecipient["type"];
  status: EmailRecipient["status"];
  outcome: RecipientOutcome;
  explanation: string;
  /** The receiving server's or provider's own words, when there are any. */
  details?: Record<string, unknown>;
  next_steps: string[];
}

export interface Diagnosis {
  email_id: string;
  subject: string;
  from: string;
  status: Email["status"];
  sandbox: boolean;
  verdict: Verdict;
  summary: string;
  failure: { code: string; message: string; explanation: string; next_steps: string[] } | null;
  recipients: RecipientDiagnosis[];
  /** Account or setup problems that affect this email or the next ones. */
  warnings: string[];
  timeline: { at: string; type: string; recipient: string | null }[];
  created_at: string;
  sent_at: string | null;
  scheduled_at: string | null;
}

export interface DiagnosisContext {
  /** Suppression entries of recipient addresses (from `check_suppression`). */
  suppressions?: Record<string, Suppression[]>;
  /** The From address's domain, as coss.com has it; `null` when no domain matched. */
  domain?: { name: string; status: string; can_send: boolean } | null;
  reputation?: { status: ReputationStatus; reason: string | null } | null;
  billing?: { status: string; holds: { reason: string; since: string }[] } | null;
}

/** Failure codes and what they mean for the developer. */
const FAILURES: Record<string, { explanation: string; next_steps: string[] }> = {
  all_recipients_suppressed: {
    explanation:
      "Every recipient is on the environment's suppression list (earlier hard bounces, spam " +
      "complaints, or manual entries), so coss.com sent nothing.",
    next_steps: [
      "Look at each recipient's suppression entry (check_suppression).",
      "Only remove an entry (remove_suppression) if the address is known to be valid again; sending to addresses that bounced or complained hurts your reputation.",
    ],
  },
  domain_not_verified: {
    explanation:
      "The From domain was not a verified domain of the organization when the email was due " +
      "to be sent (live keys must send from a verified domain).",
    next_steps: [
      "Check the domain's DNS records and status (list_domains, get_domain).",
      "Add the missing records, then verify_domain, and send again.",
    ],
  },
  account_suspended: {
    explanation:
      "Live sending is suspended for the organization because of its sending reputation.",
    next_steps: [
      "Call get_account_status for the reason and the checks behind it.",
      "Contact coss.com support; a suspension is only lifted by support.",
    ],
  },
  sending_paused: {
    explanation:
      "The email provider paused sending for the organization because of its sending reputation.",
    next_steps: ["Call get_account_status, and contact coss.com support."],
  },
  content_rejected: {
    explanation:
      "coss.com's content screening blocked the email as abusive (for example phishing or spam). " +
      "This can also suspend the organization's live sending.",
    next_steps: [
      "Review the email's content and links.",
      "Call get_account_status; if this is a false positive, contact coss.com support.",
    ],
  },
  content_screening_unavailable: {
    explanation:
      "The email was held because content screening was unavailable, and coss.com gave up after an hour.",
    next_steps: ["Send the email again."],
  },
  attachments_unavailable: {
    explanation: "The email's attachments were no longer stored when it was due to be sent.",
    next_steps: ["Send the email again with its attachments."],
  },
  dispatch_failed: {
    explanation:
      "coss.com could not hand the email to the email provider within an hour of when it was due.",
    next_steps: ["Send the email again (with a new idempotency key)."],
  },
  dispatch_interrupted: {
    explanation:
      "Sending was interrupted before the provider confirmed it. The provider may still have " +
      "sent it; a late confirmation would turn the email back to sent.",
    next_steps: [
      "Check again in a few minutes before resending, so the recipient doesn't get it twice.",
    ],
  },
  provider_error: {
    explanation: "The email provider refused the email when coss.com handed it over.",
    next_steps: [
      "Send it again later.",
      "If it keeps happening, contact coss.com support with the email id.",
    ],
  },
  provider_failure: {
    explanation:
      "The email provider accepted the email, then gave up on the whole message (for example " +
      "it couldn't render it, or rejected an attachment).",
    next_steps: ["Check the failure message, fix the content, and send again."],
  },
};

const UNKNOWN_FAILURE = {
  explanation: "The email could not be sent.",
  next_steps: [
    "Check the failure message; send again or contact coss.com support with the email id.",
  ],
};

const MINUTE = 60_000;

function describeFailure(failure: { code: string; message: string }) {
  const known = FAILURES[failure.code] ?? UNKNOWN_FAILURE;
  return { ...failure, ...known };
}

/** The latest event of a type for a recipient (events come oldest first). */
function latest(events: EmailEvent[], type: EmailEvent["type"], address: string) {
  let found: EmailEvent | undefined;
  for (const event of events) {
    if (event.type === type && event.recipient?.toLowerCase() === address) found = event;
  }
  return found;
}

function minutesSince(iso: string, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - Date.parse(iso)) / MINUTE));
}

function suppressionNote(entries: Suppression[] | undefined): Record<string, unknown> | undefined {
  if (!entries || entries.length === 0) return undefined;
  return {
    suppressions: entries.map((entry) => ({
      id: entry.id,
      scope: entry.scope,
      reason: entry.reason,
      created_at: entry.created_at,
    })),
  };
}

function diagnoseRecipient(
  email: Email | EmailSummary,
  recipient: EmailRecipient,
  events: EmailEvent[],
  context: DiagnosisContext,
  now: Date,
): RecipientDiagnosis {
  const base = { address: recipient.address, type: recipient.type, status: recipient.status };
  const suppressions = context.suppressions?.[recipient.address];
  switch (recipient.status) {
    case "delivered": {
      const event = latest(events, "email.delivered", recipient.address);
      return {
        ...base,
        outcome: "delivered",
        explanation: email.sandbox
          ? "Delivered (simulated: sandbox emails never leave coss.com)."
          : "The recipient's mail server accepted the email. Whether it shows in the inbox or in spam is up to the receiving provider.",
        ...(event?.data.delivery?.smtp_response
          ? { details: { smtp_response: event.data.delivery.smtp_response, at: event.occurred_at } }
          : {}),
        next_steps: email.sandbox
          ? []
          : [
              "If the recipient can't find it, ask them to check spam, and make sure the From domain has DKIM, SPF (MAIL FROM) and DMARC records verified (get_domain).",
            ],
      };
    }
    case "bounced": {
      const bounce = latest(events, "email.bounced", recipient.address)?.data.bounce;
      const permanent = bounce?.type === "permanent";
      return {
        ...base,
        outcome: "bounced",
        explanation: permanent
          ? "Hard bounce: the receiving server permanently rejected the address (it doesn't exist or doesn't accept mail). coss.com adds such addresses to the suppression list, so later emails to it are skipped."
          : "Soft bounce: the receiving server refused the email for now (for example a full mailbox or a temporary problem). The address is not suppressed.",
        details: {
          ...(bounce
            ? {
                bounce_type: bounce.type,
                bounce_sub_type: bounce.sub_type,
                diagnostic_code: bounce.diagnostic_code,
              }
            : {}),
          ...suppressionNote(suppressions),
        },
        next_steps: permanent
          ? [
              "Check the address for typos and stop sending to it if it's wrong.",
              "Don't remove the suppression unless you know the address works now.",
            ]
          : ["Send again later; if it keeps bouncing, stop sending to it."],
      };
    }
    case "complained":
      return {
        ...base,
        outcome: "complained",
        explanation:
          "The email was delivered, then the recipient reported it as spam. coss.com adds the address to the suppression list, and complaints count against the organization's reputation.",
        ...(suppressions?.length ? { details: suppressionNote(suppressions) } : {}),
        next_steps: [
          "Don't email this address again unless the recipient asks you to.",
          "Make sure recipients expect these emails and can unsubscribe.",
        ],
      };
    case "suppressed": {
      const entry = latest(events, "email.suppressed", recipient.address)?.data.suppression;
      return {
        ...base,
        outcome: "suppressed",
        explanation:
          "coss.com skipped this recipient because the address is on the environment's suppression list" +
          (entry ? ` (reason: ${entry.reason}, scope: ${entry.scope}).` : "."),
        details: {
          ...(entry ? { matched_suppression: entry } : {}),
          ...suppressionNote(suppressions),
        },
        next_steps: [
          "If the address is valid and the recipient wants your emails, remove the entry (remove_suppression) and send again.",
        ],
      };
    }
    case "delivery_delayed": {
      const delay = latest(events, "email.delivery_delayed", recipient.address)?.data.delay;
      return {
        ...base,
        outcome: "delayed",
        explanation:
          "The receiving server hasn't accepted the email yet; the provider keeps retrying for a while.",
        ...(delay ? { details: { delay } } : {}),
        next_steps: ["Check again later. A delay that ends in failure turns into a bounce."],
      };
    }
    case "sent": {
      const age = email.sent_at ? minutesSince(email.sent_at, now) : 0;
      return {
        ...base,
        outcome: "in_progress",
        explanation:
          `The email provider accepted the email${email.sent_at ? ` ${age} minute(s) ago` : ""} and is delivering it; ` +
          "there's no confirmation from the recipient's server yet.",
        next_steps:
          age >= 10
            ? [
                "Confirmations usually arrive within seconds to minutes; check again later. Some receiving servers delay accepting mail.",
              ]
            : ["Check again in a minute."],
      };
    }
    case "queued": {
      if (email.status === "scheduled") {
        return {
          ...base,
          outcome: "scheduled",
          explanation: `The email is scheduled for ${email.scheduled_at ?? "later"}.`,
          next_steps: [],
        };
      }
      if (email.status === "failed") return failedRecipient(base, email);
      const since = email.scheduled_at ?? email.created_at;
      const age = minutesSince(since, now);
      return {
        ...base,
        outcome: "in_progress",
        explanation:
          age < 2
            ? "The email is queued and will be handed to the provider in a moment."
            : `The email has been queued for ${age} minutes without being handed to the provider. That isn't normal: after an hour it fails with dispatch_failed.`,
        next_steps:
          age < 2
            ? ["Check again in a minute."]
            : ["Call get_account_status for billing holds or a suspension."],
      };
    }
    case "failed":
      return failedRecipient(base, email);
    case "canceled":
      return {
        ...base,
        outcome: "canceled",
        explanation: "The scheduled email was canceled before it was sent.",
        next_steps: [],
      };
  }
}

function failedRecipient(
  base: Pick<RecipientDiagnosis, "address" | "type" | "status">,
  email: Email | EmailSummary,
): RecipientDiagnosis {
  const failure = email.failure ? describeFailure(email.failure) : null;
  return {
    ...base,
    outcome: "failed",
    explanation: failure
      ? `The email failed as a whole: ${failure.explanation}`
      : "The email failed before reaching this recipient.",
    next_steps: failure?.next_steps ?? [],
  };
}

function overallVerdict(email: Email | EmailSummary, outcomes: RecipientOutcome[]): Verdict {
  if (email.status === "scheduled") return "scheduled";
  if (email.status === "canceled") return "canceled";
  const delivered = outcomes.filter((o) => o === "delivered" || o === "complained").length;
  const pending = outcomes.filter((o) => o === "in_progress" || o === "delayed").length;
  if (outcomes.length > 0 && delivered === outcomes.length) return "delivered";
  if (pending > 0) return "in_progress";
  if (delivered > 0) return "partially_delivered";
  return "not_delivered";
}

function summarize(
  email: Email | EmailSummary,
  verdict: Verdict,
  recipients: RecipientDiagnosis[],
  failure: Diagnosis["failure"],
): string {
  const counts = new Map<RecipientOutcome, number>();
  for (const r of recipients) counts.set(r.outcome, (counts.get(r.outcome) ?? 0) + 1);
  const breakdown = [...counts].map(([outcome, n]) => `${n} ${outcome}`).join(", ");
  const sandbox = email.sandbox
    ? " Sent with a sandbox key, so nothing actually left coss.com."
    : "";
  switch (verdict) {
    case "delivered":
      return `Delivered to ${recipients.length === 1 ? recipients[0]?.address : `all ${recipients.length} recipients`}.${sandbox}`;
    case "partially_delivered":
      return `Delivered to some recipients only (${breakdown}).${sandbox}`;
    case "in_progress":
      return `Not finished yet (${breakdown}).${sandbox}`;
    case "scheduled":
      return `Scheduled for ${email.scheduled_at}; not sent yet.${sandbox}`;
    case "canceled":
      return "Canceled before it was sent.";
    case "not_delivered":
      return failure
        ? `Not delivered: ${failure.code} — ${failure.message}${sandbox}`
        : `Not delivered (${breakdown}).${sandbox}`;
  }
}

function accountWarnings(email: Email | EmailSummary, context: DiagnosisContext): string[] {
  const warnings: string[] = [];
  if (email.sandbox) {
    warnings.push(
      "Sandbox email: nothing is delivered to real inboxes and outcomes are simulated. Use a live (coss_live_) key and a verified domain to send for real.",
    );
  }
  if (!email.sandbox && context.domain === null) {
    warnings.push(
      "The From domain is not a domain of this organization, so live sends from it are refused (domain_not_verified).",
    );
  } else if (!email.sandbox && context.domain && !context.domain.can_send) {
    warnings.push(
      `The From domain ${context.domain.name} is ${context.domain.status} and can't send; check its DNS records (get_domain) and verify_domain.`,
    );
  }
  if (context.reputation?.status === "suspended") {
    warnings.push(
      `Live sending is suspended for the organization (${context.reputation.reason ?? "reputation"}); contact coss.com support.`,
    );
  } else if (context.reputation?.status === "warning") {
    warnings.push(
      `The organization's sending reputation has a warning (${context.reputation.reason ?? "see get_account_status"}); bounces and complaints should come down before it is suspended.`,
    );
  }
  if (context.billing && context.billing.holds.length > 0) {
    warnings.push(
      `Live sending is on a billing hold (${context.billing.holds.map((h) => h.reason).join(", ")}): scheduled sends wait and new live sends are refused until it is lifted.`,
    );
  }
  return warnings;
}

/** Engagement events say nothing about delivery; they're left out of the timeline. */
const TIMELINE_SKIP = new Set<EmailEvent["type"]>(["email.opened", "email.clicked"]);

export function diagnoseEmail(input: {
  email: Email | EmailSummary;
  events: EmailEvent[];
  context?: DiagnosisContext;
  now?: Date;
}): Diagnosis {
  const { email, events } = input;
  const context = input.context ?? {};
  const now = input.now ?? new Date();
  const recipients = email.recipients.map((recipient) =>
    diagnoseRecipient(email, recipient, events, context, now),
  );
  const failure = email.failure ? describeFailure(email.failure) : null;
  const verdict = overallVerdict(
    email,
    recipients.map((r) => r.outcome),
  );
  return {
    email_id: email.id,
    subject: email.subject,
    from: email.from,
    status: email.status,
    sandbox: email.sandbox,
    verdict,
    summary: summarize(email, verdict, recipients, failure),
    failure,
    recipients,
    warnings: accountWarnings(email, context),
    timeline: events
      .filter((event) => !TIMELINE_SKIP.has(event.type))
      .map((event) => ({ at: event.occurred_at, type: event.type, recipient: event.recipient })),
    created_at: email.created_at,
    sent_at: email.sent_at,
    scheduled_at: email.scheduled_at,
  };
}

/** The bare domain of a From header (`Acme <hi@acme.com>` → `acme.com`). */
export function fromDomain(from: string): string | null {
  const address = /<([^>]+)>/.exec(from)?.[1] ?? from;
  const at = address.lastIndexOf("@");
  return at === -1
    ? null
    : address
        .slice(at + 1)
        .trim()
        .toLowerCase() || null;
}

/**
 * The organization's domain that decides a From domain: the most specific one it is equal to or
 * a subdomain of, as coss.com authorizes senders.
 */
export function matchDomain<T extends { name: string }>(domains: T[], name: string): T | null {
  let best: T | null = null;
  for (const domain of domains) {
    const candidate = domain.name.toLowerCase();
    if (name === candidate || name.endsWith(`.${candidate}`)) {
      if (!best || candidate.length > best.name.length) best = domain;
    }
  }
  return best;
}
