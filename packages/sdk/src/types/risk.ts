/** Risk wire types (hand-written mirrors of the API's schemas). */

/** What is being assessed. Velocity is counted per event (`custom` events per `event_name`). */
export type RiskEvent = "signup" | "login" | "message" | "checkout" | "custom";

/** `allow`: go ahead. `review`: suspicious; limit or hold it for a person. `block`: refuse it. */
export type RiskDecision = "allow" | "review" | "block";

/** What really happened: `legitimate`, `fraud`, or `abuse` (spam, free-tier abuse…). */
export type RiskOutcome = "legitimate" | "fraud" | "abuse";

export type RiskList = "allow" | "block";

/**
 * `email` (matched by mailbox, dots and `+tags` folded), `domain` (subdomains included), `ip` (an
 * address or CIDR range), `asn`, `country` (ISO 3166-1 alpha-2), `user` (your user id).
 */
export type RiskListEntryType = "email" | "domain" | "ip" | "asn" | "country" | "user";

/** Signal groups an assessment was made without (a lookup failed or timed out). */
export type RiskDegradedSignal = "email_dns" | "ip_data" | "velocity";

/** Every reason an assessment can give (see the reason catalog in the docs). */
export type RiskReasonCode =
  | "email.invalid"
  | "email.disposable"
  | "email.undeliverable"
  | "email.role_account"
  | "email.typo"
  | "ip.tor"
  | "ip.vpn_network"
  | "ip.hosting_provider"
  | "ip.private"
  | "velocity.signups_per_ip_1h"
  | "velocity.signups_per_ip_24h"
  | "velocity.signups_per_subnet_1h"
  | "velocity.signups_per_email_domain_1h"
  | "velocity.signups_per_mailbox_24h"
  | "velocity.logins_per_ip_1h"
  | "velocity.logins_per_user_1h"
  | "velocity.events_per_ip_1h"
  | "velocity.events_per_user_1h"
  | "duplicate.canonical_mailbox"
  | "history.fraud_mailbox"
  | "history.fraud_user"
  | "history.fraud_ip"
  | "history.fraud_subnet"
  | "list.blocked"
  | "list.allowed";

/** Why an assessment decided what it did. Never show reasons to the person being assessed. */
export interface RiskReason {
  code: RiskReasonCode;
  /** For developers (dashboards, logs). */
  message: string;
  /** The count behind a `velocity.*` reason. */
  value?: number;
  /** The count a `velocity.*` reason fires at. */
  threshold?: number;
  window?: "1h" | "24h";
  /** `email.typo`: the likely domain, which you may show the user ("Did you mean …?"). */
  suggestion?: string;
  /** `ip.hosting_provider`, `ip.vpn_network`: the network's operator. */
  provider?: string;
  /** `duplicate.canonical_mailbox`: your id of the user who has the mailbox, if known. */
  previous_user?: string | null;
  /** `duplicate.canonical_mailbox`: the assessment that first saw the mailbox. */
  previous_assessment?: string;
  /** `list.*`: the matching list entry. */
  entry?: string;
  /** `list.*`: what matched. */
  type?: RiskListEntryType;
}

export interface RiskEmailSignals {
  /** `null` once the address is removed (90 days after the assessment). */
  domain: string | null;
  valid: boolean;
  disposable: boolean;
  /** From DNS (MX, A, AAAA). `unknown` when the lookup failed or timed out. */
  deliverability: "deliverable" | "undeliverable" | "unknown";
  role_account: boolean;
  free_provider: boolean;
  suggestion: string | null;
}

export interface RiskIpSignals {
  version: 4 | 6;
  private: boolean;
  tor: boolean;
  hosting: boolean;
  hosting_provider: string | null;
  hosting_kind: "cloud" | "hosting" | "vpn" | null;
  asn: number | null;
  as_name: string | null;
  /** ISO 3166-1 alpha-2. */
  country: string | null;
}

/** An assessment of one event. */
export interface RiskAssessment {
  object: "risk_assessment";
  id: string;
  event: RiskEvent;
  event_name: string | null;
  decision: RiskDecision;
  /** 0-1: how risky the signals are together. Lists can decide regardless of the score. */
  score: number;
  /** Why, most significant first. */
  reasons: RiskReason[];
  signals: {
    email: RiskEmailSignals | null;
    ip: RiskIpSignals | null;
    /**
     * Events of the same kind in this environment, this one included, keyed
     * `<dimension>_<window>` (e.g. `ip_1h`, `mailbox_24h`); `null` when unavailable.
     */
    velocity: Record<string, number> | null;
  };
  user: { id: string | null; email: string | null };
  /** `null` once removed (90 days after the assessment). */
  ip: string | null;
  degraded: RiskDegradedSignal[];
  /** The latest outcome you reported with `coss.risk.feedback`. */
  outcome: RiskOutcome | null;
  /** `open` for `review` decisions until you send feedback, then `resolved`. */
  review_status: "open" | "resolved" | null;
  /** ISO 8601 timestamp. */
  created_at: string;
}

/** Body of `POST /v1/risk/assessments`. */
export interface AssessRiskParams {
  event: RiskEvent;
  /** Required for `custom` events (e.g. `invite_sent`), not allowed otherwise. */
  event_name?: string;
  user?: {
    /** Your id for the user, when it exists (logins always; sign-ups once the account exists). */
    id?: string;
    /** The email address the user gave. */
    email?: string;
  };
  /** The client's IP address (not your server's or proxy's). */
  ip?: string;
  /** The client's user agent. */
  user_agent?: string;
}

/** Query of `GET /v1/risk/assessments`. */
export interface ListRiskAssessmentsParams {
  event?: RiskEvent;
  decision?: RiskDecision;
  user_id?: string;
  /** `open`: the review queue. */
  review_status?: "open" | "resolved";
  /** 1-100, default 50. */
  limit?: number;
  /** The `id` of the last assessment of the previous page. */
  after?: string;
}

/** Body of `POST /v1/risk/assessments/{id}/feedback`. */
export interface RiskFeedbackParams {
  outcome: RiskOutcome;
  /** For your team; never shared. */
  note?: string;
}

/** An entry of the environment's allow or block list. */
export interface RiskListEntry {
  object: "risk_list_entry";
  id: string;
  list: RiskList;
  type: RiskListEntryType;
  /** Normalized: emails as their mailbox, CIDR ranges canonical, ASNs as numbers. */
  value: string;
  note: string | null;
  /** ISO 8601 timestamp: the entry stops matching then. */
  expires_at: string | null;
  /** ISO 8601 timestamp. */
  created_at: string;
}

/** Body of `POST /v1/risk/list_entries` (`coss.risk.lists.add` builds it). */
export interface CreateRiskListEntryParams {
  list: RiskList;
  type: RiskListEntryType;
  value: string;
  note?: string;
  /** ISO 8601 timestamp with an offset. */
  expires_at?: string;
}

/** What `coss.risk.lists.add` matches on: exactly one of these. */
export type RiskListEntryValue =
  | { email: string }
  | { domain: string }
  | { ip: string }
  | { asn: string | number }
  | { country: string }
  | { user: string };

/** Query of `GET /v1/risk/list_entries`. */
export interface ListRiskListEntriesParams {
  list?: RiskList;
  type?: RiskListEntryType;
  /** 1-100, default 50. */
  limit?: number;
  after?: string;
}

/** Response of `DELETE /v1/risk/list_entries/{id}`. */
export interface DeletedRiskListEntry {
  object: "risk_list_entry";
  id: string;
  deleted: true;
}

/** Response of `DELETE /v1/risk/users/{user_id}`. */
export interface ForgottenRiskUser {
  object: "risk_user";
  /** Your user id. */
  id: string;
  deleted: true;
}
