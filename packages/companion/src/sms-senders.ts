// The organization's SMS senders (numbers, carrier registration), SMS suppressions and dedicated IPs.

export type SmsRegistrationKind = "us_10dlc" | "toll_free";

export type SmsRegistrationStatus =
  | "draft"
  | "submitted"
  | "in_review"
  | "approved"
  | "rejected"
  | "failed";

/**
 * The "Sending" column of the dashboard's numbers table: `can_send`, `setting_up` (the number
 * isn't in its approved registration's messaging service yet), else its registration's status
 * (`not_registered`: none).
 */
export type SmsNumberSending = "can_send" | "setting_up" | "not_registered" | SmsRegistrationStatus;

export type MobileSmsNumber = {
  id: string;
  /** E.164. */
  phone_number: string;
  kind: "local" | "toll_free";
  sending: SmsNumberSending;
  /** "Project / Environment" of the live environment its replies go to; `null`: dropped. */
  replies_to: string | null;
};

export type MobileSmsRegistration = {
  id: string;
  kind: SmsRegistrationKind;
  /** The business's legal name (nothing else of the registration's profile). */
  business: string;
  status: SmsRegistrationStatus;
  rejection_reason: string | null;
  submitted_at: string | null;
};

/** A country with a list price for SMS segments. */
export type MobileSmsCountry = {
  /** ISO 3166-1 alpha-2. */
  code: string;
  name: string;
  /** Price per segment, formatted ("$0.0083"). */
  price: string;
  /** Live messages may go there. */
  allowed: boolean;
  /** High risk and not unlocked for the organization: only support can allow it. */
  locked: boolean;
};

export type SmsSendersResponse = {
  /**
   * The page's alert: `unavailable` (numbers can't be bought here yet), `register_10dlc` (local
   * numbers without a US A2P 10DLC registration in progress or approved), or none.
   */
  notice: "unavailable" | "register_10dlc" | null;
  /** Whether the role may register senders and buy numbers (on coss.com). */
  can_create: boolean;
  numbers: MobileSmsNumber[];
  registrations: MobileSmsRegistration[];
  /** Every priced country, by name. */
  countries: MobileSmsCountry[];
};

export type SmsSuppressionReason = "opt_out" | "invalid_number" | "manual";

export type MobileSmsSuppression = {
  id: string;
  phone_number: string;
  reason: SmsSuppressionReason;
  created_at: string;
};

export type DedicatedIpPoolStatus =
  | "not_enabled"
  | "waiting"
  | "provisioning"
  | "warming"
  | "ready"
  | "releasing";

export type DedicatedIpsResponse = {
  status: DedicatedIpPoolStatus;
  /** What is holding the pool up, if anything. */
  message: string | null;
  ips: { ip: string; delivered_7d: number }[];
  /** Share (0–1) of the last 7 days' deliveries that left from the pool's IPs (`null`: too few). */
  dedicated_share: number | null;
  /** The deliveries `dedicated_share` needs before it is shown. */
  ready_min_deliveries: number;
  ready_at: string | null;
  /** The Dedicated IPs add-on, for the `not_enabled` page. */
  add_on: { monthly_price: string; plans: string[] };
  /** Whether the role can open the billing page (where the add-on is managed). */
  can_read_billing: boolean;
};
