/**
 * Turning reasons into a score and a decision. Pure: the assessment collects the signals, this
 * decides. The score is a noisy-OR of the weights in `REASONS` (each reason independently "explains"
 * the risk), so it reads as a probability-like 0-1 and adding a reason never lowers it.
 */
import {
  DEFAULT_THRESHOLDS,
  REASONS,
  type RiskDecision,
  type RiskListEntryType,
  type RiskReasonCode,
  type RiskReasonOutput,
  type VelocityWindow,
} from "./schemas.ts";

/** A reason as stored: its code and details, never an identifier (messages are rendered on read). */
export type StoredReason = {
  code: RiskReasonCode;
  value?: number;
  threshold?: number;
  window?: VelocityWindow;
  suggestion?: string;
  provider?: string;
  previous_user?: string | null;
  previous_assessment?: string;
  entry?: string;
  type?: RiskListEntryType;
  rule?: string;
  name?: string;
};

export function scoreReasons(reasons: readonly StoredReason[]): number {
  let clean = 1;
  for (const reason of reasons) clean *= 1 - REASONS[reason.code].weight;
  return Math.round((1 - clean) * 1000) / 1000;
}

export type Thresholds = { review: number; block: number };

/** Lists first (allow beats block), then the first matching rule, then the thresholds. */
export function decide(
  score: number,
  reasons: readonly StoredReason[],
  thresholds: Thresholds = DEFAULT_THRESHOLDS,
  ruleAction: RiskDecision | null = null,
): RiskDecision {
  if (reasons.some((reason) => reason.code === "list.allowed")) return "allow";
  if (reasons.some((reason) => reason.code === "list.blocked")) return "block";
  if (ruleAction) return ruleAction;
  if (score >= thresholds.block) return "block";
  if (score >= thresholds.review) return "review";
  return "allow";
}

/** Decisions first (lists, then rules), then by weight (most significant first), then by code. */
export function sortReasons(reasons: readonly StoredReason[]): StoredReason[] {
  const rank = (reason: StoredReason) =>
    reason.code.startsWith("list.")
      ? 3
      : reason.code === "rule.matched"
        ? 2
        : REASONS[reason.code].weight;
  return [...reasons].sort((a, b) => rank(b) - rank(a) || a.code.localeCompare(b.code));
}

const WINDOW_TEXT: Record<VelocityWindow, string> = {
  "1h": "in the last hour",
  "24h": "in the last 24 hours",
};

const VELOCITY_SUBJECT: Record<string, string> = {
  "velocity.signups_per_ip_1h": "sign-ups from this IP address",
  "velocity.signups_per_ip_24h": "sign-ups from this IP address",
  "velocity.signups_per_subnet_1h": "sign-ups from this subnet",
  "velocity.signups_per_email_domain_1h": "sign-ups with this email domain",
  "velocity.signups_per_mailbox_24h": "sign-up attempts for this mailbox",
  "velocity.logins_per_ip_1h": "logins from this IP address",
  "velocity.logins_per_user_1h": "logins to this user",
  "velocity.events_per_ip_1h": "events from this IP address",
  "velocity.events_per_user_1h": "events from this user",
};

/** A one-line explanation for developers (dashboards, logs). Never names the user or address. */
export function reasonMessage(reason: StoredReason): string {
  switch (reason.code) {
    case "email.invalid":
      return "The email address is not valid.";
    case "email.disposable":
      return "The email domain belongs to a disposable-mail service.";
    case "email.undeliverable":
      return "The email domain can't receive mail.";
    case "email.role_account":
      return "The email address is a role account, not a person.";
    case "email.typo":
      return `The domain looks like a typo of ${reason.suggestion ?? "a popular domain"}.`;
    case "email.domain_new":
      return "The email domain was registered in the last 30 days.";
    case "ip.tor":
      return "The IP address is a Tor exit node.";
    case "ip.vpn_network":
      return `The IP address belongs to a VPN or proxy network (${reason.provider ?? "unknown"}).`;
    case "ip.hosting_provider":
      return `The IP address belongs to a hosting provider (${reason.provider ?? "unknown"}).`;
    case "ip.private":
      return "The IP address is private or reserved: pass the client's address, not your proxy's.";
    case "duplicate.canonical_mailbox":
      return reason.previous_user
        ? `This mailbox already belongs to user ${reason.previous_user}.`
        : "This mailbox was already used to sign up.";
    case "history.fraud_mailbox":
      return "This mailbox was reported as fraud or abuse before.";
    case "history.fraud_user":
      return "This user was reported as fraud or abuse before.";
    case "history.fraud_ip":
      return "This IP address was reported as fraud or abuse in the last 30 days.";
    case "history.fraud_subnet":
      return "This subnet was reported as fraud or abuse in the last 30 days.";
    case "login.new_country":
      return "This user never logged in from this country before.";
    case "login.new_network":
      return "This user never logged in from this network before.";
    case "captcha.failed":
      return "The captcha token was refused.";
    case "captcha.missing":
      return "No captcha token, while your settings require one.";
    case "content.spam":
    case "content.phishing":
    case "content.malware":
    case "content.fraud":
      return `The content's ${reason.code.slice("content.".length)} score (${reason.value ?? "?"}) reached your threshold (${reason.threshold ?? "?"}).`;
    case "rule.matched":
      return `Your rule "${reason.name ?? reason.rule ?? "rule"}" matched.`;
    case "list.blocked":
      return `Your block list matched (${reason.type ?? "entry"}).`;
    case "list.allowed":
      return `Your allow list matched (${reason.type ?? "entry"}).`;
    default: {
      const subject = VELOCITY_SUBJECT[reason.code] ?? "events";
      const window = reason.window ? ` ${WINDOW_TEXT[reason.window]}` : "";
      return `${reason.value ?? "Many"} ${subject}${window}.`;
    }
  }
}

export function toReasonObject(reason: StoredReason): RiskReasonOutput {
  return { ...reason, message: reasonMessage(reason) };
}
