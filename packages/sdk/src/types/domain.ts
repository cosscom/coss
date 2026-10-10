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
