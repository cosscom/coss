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
export type RiskDegradedSignal =
  | "email_dns"
  | "domain_age"
  | "ip_data"
  | "velocity"
  | "captcha"
  | "content";

/** What content classification scores. */
export type RiskContentCategory = "spam" | "phishing" | "malware" | "fraud";

/**
 * Per category, the model's probability (0-1) that the content belongs to it. Not calibrated:
 * pick thresholds by looking at your own traffic.
 */
export type RiskContentScores = Record<RiskContentCategory, number>;

/** Every reason an assessment can give (see the reason catalog in the docs). */
export type RiskReasonCode =
  | "email.invalid"
  | "email.disposable"
  | "email.undeliverable"
  | "email.role_account"
  | "email.typo"
  | "email.domain_new"
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
  | "login.new_country"
  | "login.new_network"
  | "captcha.failed"
  | "captcha.missing"
  | "content.spam"
  | "content.phishing"
  | "content.malware"
  | "content.fraud"
  | "rule.matched"
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
  /** `rule.matched`: the rule's id. */
  rule?: string;
  /** `rule.matched`: the rule's name. */
  name?: string;
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
  /**
   * Days since the domain was registered (RDAP); `null` when unknown or not looked up (free
   * providers, disposable domains).
   */
  domain_age_days: number | null;
}

export interface RiskCaptchaSignals {
  provided: boolean;
  /** `null` when it couldn't be checked (no captcha configured, or the provider was unreachable). */
  passed: boolean | null;
}

/** Logins of a user with history: whether the country or network is new for them. */
export interface RiskLoginSignals {
  new_country: boolean;
  new_network: boolean;
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
    captcha: RiskCaptchaSignals | null;
    login: RiskLoginSignals | null;
    /** `null` when no content was given or it couldn't be classified. */
    content: RiskContentScores | null;
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
  /**
   * The token your captcha widget (Turnstile or hCaptcha, set in the risk settings) gave the
   * browser. Verified once: don't reuse it.
   */
  captcha?: { token: string };
  /**
   * Text the user wrote (a bio, a message, a listing), classified with the event and never
   * stored: its scores go in `signals.content`, and `content.*` reasons fire only at thresholds
   * you set.
   */
  content?: { text: string };
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

export type RiskCaptchaProvider = "turnstile" | "hcaptcha";

/** The environment's risk settings. */
export interface RiskSettings {
  object: "risk_settings";
  /** Scores at or above it are `review`. */
  review_threshold: number;
  /** Scores at or above it are `block`. */
  block_threshold: number;
  /** Reasons that never fire in this environment. */
  disabled_reasons: RiskReasonCode[];
  /** The captcha provider assessments verify tokens with (never the secret). */
  captcha: { provider: RiskCaptchaProvider; required: boolean } | null;
  /** Per content category, the score at which `content.<category>` fires; `null`: never. */
  content_thresholds: Record<RiskContentCategory, number | null>;
  /** ISO 8601 timestamp; `null` while on the defaults. */
  updated_at: string | null;
}

/** Body of `PATCH /v1/risk/settings`: only the fields given change. */
export interface UpdateRiskSettingsParams {
  review_threshold?: number;
  block_threshold?: number;
  disabled_reasons?: RiskReasonCode[];
  /** `null` turns captcha verification off and deletes the secret. */
  captcha?: {
    provider: RiskCaptchaProvider;
    /** Required when setting a provider for the first time or changing it. */
    secret?: string;
    /** Assessments without a token get `captcha.missing`. */
    required?: boolean;
  } | null;
  /** Changes the categories given: a score in (0, 1] sets the threshold, `null` removes it. */
  content_thresholds?: Partial<Record<RiskContentCategory, number | null>>;
}

/** A field a rule condition can test (see the rules guide). */
export type RiskRuleField =
  | "email.valid"
  | "email.disposable"
  | "email.undeliverable"
  | "email.role_account"
  | "email.free_provider"
  | "email.typo"
  | "email.domain_new"
  | "email.domain"
  | "email.domain_age_days"
  | "ip.tor"
  | "ip.hosting"
  | "ip.vpn"
  | "ip.private"
  | "ip.country"
  | "ip.asn"
  | "ip.hosting_provider"
  | "captcha.passed"
  | "duplicate.canonical_mailbox"
  | "history.fraud"
  | "login.new_country"
  | "login.new_network"
  | "content.spam"
  | "content.phishing"
  | "content.malware"
  | "content.fraud"
  | "score"
  | "velocity.ip_1h"
  | "velocity.ip_24h"
  | "velocity.subnet_1h"
  | "velocity.subnet_24h"
  | "velocity.email_domain_1h"
  | "velocity.email_domain_24h"
  | "velocity.mailbox_1h"
  | "velocity.mailbox_24h"
  | "velocity.user_1h"
  | "velocity.user_24h";

/** A test of one field. A field without a value (no IP, no email…) never matches. */
export interface RiskRuleCondition {
  field: RiskRuleField;
  /** `is` (booleans); `eq`, `neq`, `gt`, `gte`, `lt`, `lte` (numbers); `eq`, `neq`, `in`, `not_in` (strings). */
  operator: "is" | "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "in" | "not_in";
  value: boolean | number | string | string[];
}

/** A rule: the first enabled one whose conditions match decides (after the lists). */
export interface RiskRule {
  object: "risk_rule";
  id: string;
  name: string;
  enabled: boolean;
  /** Rules are tried in ascending order. */
  position: number;
  /** Events it applies to; empty: every event. */
  events: RiskEvent[];
  /** `all`: every condition must hold. `any`: one is enough. */
  match: "all" | "any";
  conditions: RiskRuleCondition[];
  action: RiskDecision;
  /** ISO 8601 timestamp. */
  created_at: string;
  /** ISO 8601 timestamp. */
  updated_at: string;
}

/** Body of `POST /v1/risk/rules`. */
export interface CreateRiskRuleParams {
  name: string;
  enabled?: boolean;
  /** Default 0. */
  position?: number;
  events?: RiskEvent[];
  /** Default `all`. */
  match?: "all" | "any";
  conditions: RiskRuleCondition[];
  action: RiskDecision;
}

/** Body of `PATCH /v1/risk/rules/{id}`: only the fields given change. */
export type UpdateRiskRuleParams = Partial<CreateRiskRuleParams>;

/** Response of `DELETE /v1/risk/rules/{id}`. */
export interface DeletedRiskRule {
  object: "risk_rule";
  id: string;
  deleted: true;
}

/** Result of `coss.risk.checkEmail()`: what COSS knows about an address. Nothing is stored. */
export interface RiskEmailCheck {
  object: "risk_email_check";
  email: string;
  valid: boolean;
  domain: string | null;
  /** The mailbox with the provider's aliasing folded (dots and `+tags` at Gmail…). */
  canonical: string | null;
  disposable: boolean;
  /** From DNS (MX, A, AAAA). `unknown` when the lookup failed or timed out. */
  deliverability: "deliverable" | "undeliverable" | "unknown";
  role_account: boolean;
  free_provider: boolean;
  /** The likely intended domain when this one looks like a typo of a popular one. */
  suggestion: string | null;
  /** Days since the domain was registered (RDAP); `null` when unknown or not looked up. */
  domain_age_days: number | null;
  /** Lookups that failed or timed out. */
  degraded: ("email_dns" | "domain_age")[];
}

/** Result of `coss.risk.checkIp()`. Nothing is stored. */
export interface RiskIpCheck extends RiskIpSignals {
  object: "risk_ip_check";
  ip: string;
  /** `ip_data` when some IP data is unavailable at the moment. */
  degraded: "ip_data"[];
}

/** Result of `coss.risk.classify()`: scores only, neither stored nor logged. */
export interface RiskContentClassification {
  object: "risk_content_classification";
  scores: RiskContentScores;
  /** The text was longer than the model reads (8,000 characters): only its beginning counted. */
  truncated: boolean;
}

/** What `on_failure` answers while COSS can't count. */
export type RiskLimitFailureMode = "allow" | "deny";

/** One of your rate limit buckets: each key gets `burst` tokens, refilling `limit` per period. */
export interface RiskLimitBucket {
  object: "risk_limit_bucket";
  id: string;
  /** What `coss.risk.limit({ bucket })` names it by. */
  name: string;
  /** Tokens added per `period_seconds`. */
  limit: number;
  period_seconds: number;
  /** How many requests a key can make at once. */
  burst: number;
  on_failure: RiskLimitFailureMode;
  /** ISO 8601 timestamp. */
  created_at: string;
  /** ISO 8601 timestamp. */
  updated_at: string;
}

/** Body of `POST /v1/risk/limit_buckets`. */
export interface CreateRiskLimitBucketParams {
  /** 1-64 lower-case letters, digits, `.`, `_` or `-`; unique in the environment. */
  name: string;
  limit: number;
  /** 1 second to 1 day. */
  period_seconds: number;
  /** Defaults to `limit`. */
  burst?: number;
  /** Defaults to `allow`. */
  on_failure?: RiskLimitFailureMode;
}

/** Body of `PATCH /v1/risk/limit_buckets/{id}` (the name can't change). */
export type UpdateRiskLimitBucketParams = Partial<Omit<CreateRiskLimitBucketParams, "name">>;

export interface DeletedRiskLimitBucket {
  object: "risk_limit_bucket";
  id: string;
  deleted: true;
}

/** Body of `POST /v1/risk/limits`. */
export interface CheckRiskLimitParams {
  /** The bucket's name. */
  bucket: string;
  /** Who or what is limited (a user id, an email or IP address…); COSS keeps only a hash. */
  key: string;
  /** Tokens this request takes. Default 1. */
  cost?: number;
}

/** Result of `coss.risk.limit()`. */
export interface RiskLimit {
  object: "risk_limit";
  bucket: string;
  /** Whether to let the request through. Denied requests take no tokens. */
  allowed: boolean;
  /** The bucket's size (`burst`). */
  limit: number;
  /** Tokens left for this key. */
  remaining: number;
  /** Milliseconds until the key's bucket is full again. */
  reset_ms: number;
  /** When denied: milliseconds until the same request would fit; `null` if it never would. */
  retry_after_ms: number | null;
  /** COSS couldn't count: `allowed` is the bucket's `on_failure`. */
  degraded: boolean;
}
