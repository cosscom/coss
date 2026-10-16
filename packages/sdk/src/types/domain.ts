/**
 * Sending domain wire types. Hand-written to mirror the API's snake_case JSON 1:1 (the API's
 * contract test asserts they stay assignable to and from its zod schemas).
 */

/**
 * `pending` while the DNS records are being checked, `verified` once they are,
 * `temporary_failure` after a transient DNS problem, and `failed` when verification gave up
 * (72 hours) — call `verify` to start over. `deleting` is a removal in progress.
 */
export type DomainStatus = "pending" | "verified" | "temporary_failure" | "failed" | "deleting";

/** Verification state of the `send.` bounce subdomain. */
export type MailFromStatus = "pending" | "success" | "temporary_failure" | "failed";

/**
 * What a record is for: `dkim` signs messages, `mail_from_mx` and `mail_from_spf` set up the
 * bounce subdomain, and `dmarc` is recommended but not required.
 */
export type DomainRecordPurpose = "dkim" | "mail_from_mx" | "mail_from_spf" | "dmarc";

/** What the last DNS check saw. `not_checked` means DNS has not been consulted yet. */
export type DomainRecordStatus = "verified" | "missing" | "mismatch" | "not_checked";

/** One DNS record a domain needs (or, when `required` is `false`, should have). */
export interface DomainRecord {
  purpose: DomainRecordPurpose;
  type: "CNAME" | "MX" | "TXT";
  /** The fully qualified record name to create. */
  name: string;
  value: string;
  /** `MX` records only. */
  priority: number | null;
  /** `false` for records that are only recommended. */
  required: boolean;
  status: DomainRecordStatus;
  /** What DNS returned when it did not match. */
  found: string[];
}

/**
 * `pending` until the CNAME points at COSS and its certificate is issued, `active` once tracking
 * links of emails sent from the domain use it, `temporary_failure` when an active hostname stopped
 * working (emails fall back to the default tracking host meanwhile), and `failed` when setup gave
 * up (72 hours) — call `domains.verify` to start over. `deleting` is a removal in progress.
 */
export type TrackingDomainStatus =
  | "pending"
  | "active"
  | "temporary_failure"
  | "failed"
  | "deleting";

/** The CNAME a tracking domain needs, with the result of the last check. */
export interface TrackingDomainRecord {
  type: "CNAME";
  /** The fully qualified record name to create. */
  name: string;
  /** The host the record must point at. */
  value: string;
  status: DomainRecordStatus;
  /** What DNS returned when it did not match. */
  found: string[];
}

/** A domain's custom tracking domain: open pixels and click redirects use it while `active`. */
export interface TrackingDomain {
  /** The tracking hostname, a subdomain of the domain (e.g. `links.acme.com`). */
  hostname: string;
  status: TrackingDomainStatus;
  record: TrackingDomainRecord;
  /** What is holding the hostname up, when the certificate provider said. */
  message: string | null;
  /** ISO 8601 timestamp. */
  created_at: string;
  last_checked_at: string | null;
  activated_at: string | null;
  failed_at: string | null;
}

/** The MX record a receiving domain needs, with the result of the last check. */
export interface ReceivingDomainRecord {
  type: "MX";
  /** The fully qualified record name to create. */
  name: string;
  /** The mail exchange the record must point at. */
  value: string;
  priority: number;
  /** `verified` once the most preferred MX records point at COSS. */
  status: DomainRecordStatus;
  /** What DNS returned when it did not match. */
  found: string[];
}

/** A domain's receiving hostname: email to any address at it is received by `environment_id`. */
export interface ReceivingDomain {
  /** The domain itself or a subdomain of it (e.g. `inbound.acme.com`). */
  hostname: string;
  environment_id: string;
  record: ReceivingDomainRecord;
  /** ISO 8601 timestamp. */
  created_at: string;
  last_checked_at: string | null;
}

/**
 * `configured` when the BIMI record is valid and DMARC is enforced, `invalid` when a record exists
 * but something is wrong (see `issues`), `missing` when there is no record, and `not_checked` until
 * DNS has been consulted. COSS checks DNS only: mailbox providers still validate the logo and the
 * certificate.
 */
export type BimiStatus = "not_checked" | "missing" | "invalid" | "configured";

/** What keeps a domain's logo from showing, as far as DNS tells. */
export type BimiIssueCode =
  | "dmarc_missing"
  | "dmarc_not_enforced"
  | "dmarc_partial"
  | "record_multiple"
  | "record_invalid"
  | "logo_missing"
  | "logo_not_https"
  | "certificate_missing"
  | "certificate_not_https";

/** The last BIMI check of a domain (brand logos in inboxes; the certificate is your own). */
export interface DomainBimi {
  status: BimiStatus;
  /**
   * Where the BIMI record was found, or looked up when there is none: `default._bimi.<domain>`,
   * or the organizational domain's when only it has one.
   */
  name: string;
  /** The `v=BIMI1` record found. */
  record: string | null;
  /** The record's logo URL (`l=`). */
  logo_url: string | null;
  /** The record's VMC or CMC certificate URL (`a=`). */
  certificate_url: string | null;
  /**
   * The DMARC policy that applies to the domain (`sp` when it comes from a parent domain), `null`
   * without a DMARC record.
   */
  dmarc_policy: "none" | "quarantine" | "reject" | null;
  issues: { code: BimiIssueCode; message: string }[];
}

/** A sending domain of the organization. */
export interface Domain {
  object: "domain";
  id: string;
  /** The domain, lower-cased. */
  name: string;
  status: DomainStatus;
  /** Whether live keys may send from this domain right now. */
  can_send: boolean;
  region: string | null;
  /** The envelope sender subdomain bounces come back to. */
  mail_from_domain: string;
  mail_from_status: MailFromStatus;
  /** The DNS records to publish, with the result of the last check. */
  records: DomainRecord[];
  /** ISO 8601 timestamp. */
  created_at: string;
  last_checked_at: string | null;
  verified_at: string | null;
  failed_at: string | null;
  /** The custom tracking domain, or `null` when none is set up. */
  tracking: TrackingDomain | null;
  /** The receiving hostname, or `null` when the domain doesn't receive email. */
  receiving: ReceivingDomain | null;
  /** The last BIMI check: whether mailbox providers can find the domain's brand logo. */
  bimi: DomainBimi;
}

/** Body of `POST /v1/domains`. */
export interface CreateDomainParams {
  /**
   * The domain to send from, without a scheme or path (`"acme.com"`, `"mail.acme.com"`).
   * Internationalized domains must be punycode-encoded.
   */
  name: string;
}

/** Returned by `domains.delete`. */
export interface DeletedDomain {
  object: "domain";
  id: string;
  deleted: true;
}

/** Body of `POST /v1/domains/{id}/tracking`. */
export interface CreateTrackingDomainParams {
  /** A subdomain of the domain to serve tracking links from (`"links.acme.com"`). */
  hostname: string;
}

/** Body of `POST /v1/domains/{id}/receiving`. */
export interface CreateReceivingDomainParams {
  /** The domain itself or a subdomain of it (`"inbound.acme.com"`). */
  hostname: string;
}
