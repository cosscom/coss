/**
 * Contact, audience, segment and topic wire types (hand-written mirrors of the API's schemas;
 * `apps/api/test/contract-types.ts` keeps them in step).
 */

/**
 * Consent to marketing email: `subscribed`, `unsubscribed` (never receives marketing email;
 * transactional email is unaffected) or `pending` (waiting for a double opt-in confirmation).
 */
export type ContactStatus = "subscribed" | "unsubscribed" | "pending";
export type ContactSource = "api" | "dashboard" | "import" | "preference_center" | "form";
export type ContactTopicStatus = "opted_in" | "opted_out";
/** Values of custom properties (`date` ones are ISO 8601 strings). */
export type ContactPropertyValue = string | number | boolean;

export interface Contact {
  object: "contact";
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  status: ContactStatus;
  properties: Record<string, ContactPropertyValue>;
  /** How the contact was created. */
  source: ContactSource;
  /** ISO 8601 timestamps. */
  subscribed_at: string | null;
  unsubscribed_at: string | null;
  /** When the contact confirmed a double opt-in. */
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContactTopicChoice {
  /** The topic's key. */
  topic: string;
  status: ContactTopicStatus;
}

interface ContactFields {
  first_name?: string | null;
  last_name?: string | null;
  /** Merged into the contact's properties; `null` removes one. Define properties first. */
  properties?: Record<string, ContactPropertyValue | null>;
  /** Omitted, a new contact is `subscribed` and an existing one keeps its status. */
  status?: "subscribed" | "unsubscribed";
}

/** `POST /v1/contacts`: creates the contact with this address, or updates it. */
export interface UpsertContactParams extends ContactFields {
  email: string;
  /** Audiences to add the contact to (it stays in the others). */
  audience_ids?: string[];
  /** Choices per topic; topics left out keep the contact's choice. */
  topics?: ContactTopicChoice[];
  /**
   * Ask the contact to confirm first (default: the marketing settings' `double_opt_in_default`):
   * it stays `pending` until they click the confirmation email's link.
   */
  double_opt_in?: boolean;
}

export interface UpdateContactParams extends ContactFields {
  topics?: ContactTopicChoice[];
}

export interface ListContactsParams {
  email?: string;
  status?: ContactStatus;
  /** Only members of this audience. */
  audience_id?: string;
  /** 1-100, default 50. */
  limit?: number;
  /** The `id` of the last contact of the previous page. */
  after?: string;
}

export interface ExportContactsParams {
  status?: ContactStatus;
  audience_id?: string;
}

export interface ImportContactEntry extends Omit<ContactFields, "status"> {
  email: string;
  /**
   * `subscribed` or `unsubscribed`; anything else (like an export's `pending`) is reported in
   * the import's `invalid` instead of refusing the request.
   */
  status?: "subscribed" | "unsubscribed" | (string & {});
}

export interface ImportContactsParams {
  contacts: ImportContactEntry[];
  /** Adds every imported contact to this audience. */
  audience_id?: string;
}

export interface ContactImport {
  object: "contact_import";
  created: number;
  updated: number;
  /** Existing contacts marked `subscribed` that stay `unsubscribed`: imports never re-subscribe. */
  kept_unsubscribed: number;
  invalid: { index: number; email: string; message: string }[];
}

export interface DeletedContact {
  object: "contact";
  id: string;
  deleted: true;
}

export interface ContactTopics {
  object: "contact_topics";
  contact_id: string;
  topics: {
    topic: string;
    name: string;
    /** Whether emails about the topic reach the contact. */
    subscribed: boolean;
    /** The contact's explicit choice; `null`: the topic's default applies. */
    choice: ContactTopicStatus | null;
  }[];
}

export interface UpdateContactTopicsParams {
  topics: ContactTopicChoice[];
}

/** What `resendConfirmation` did. */
export interface ContactConfirmation {
  object: "contact_confirmation";
  contact_id: string;
  /**
   * `sent`; `cooldown` (one per contact per day); `limit_reached` (three were sent and none
   * confirmed); `not_pending` (the contact isn't waiting to confirm).
   */
  status: "sent" | "cooldown" | "limit_reached" | "not_pending";
}

export interface CreatePreferenceLinksParams {
  /** The topic your email is about: its unsubscribe link leaves just that topic. */
  topic?: string;
}

/** A contact's preference center and unsubscribe links (they never expire). */
export interface PreferenceLinks {
  object: "preference_links";
  contact_id: string;
  preferences_url: string;
  unsubscribe_url: string;
}

export type ContactPropertyType = "string" | "number" | "boolean" | "date";

export interface ContactProperty {
  object: "contact_property";
  id: string;
  key: string;
  type: ContactPropertyType;
  /** Used in templates for contacts without a value. */
  fallback: ContactPropertyValue | null;
  created_at: string;
  updated_at: string;
}

export interface CreateContactPropertyParams {
  /** `^[a-z][a-z0-9_]{0,49}$`; can't change. */
  key: string;
  type: ContactPropertyType;
  fallback?: ContactPropertyValue | null;
}

export interface UpdateContactPropertyParams {
  fallback: ContactPropertyValue | null;
}

export interface DeletedContactProperty {
  object: "contact_property";
  id: string;
  deleted: true;
}

/** A static list of contacts. */
export interface Audience {
  object: "audience";
  id: string;
  name: string;
  /** Members, whatever their status. */
  contact_count: number;
  created_at: string;
  updated_at: string;
}

export interface AudienceParams {
  name: string;
}

export interface ListParams {
  /** 1-100, default 50. */
  limit?: number;
  /** The `id` of the last item of the previous page. */
  after?: string;
}

export interface AddAudienceContactsParams {
  /** Contact ids or addresses of existing contacts. */
  contacts: string[];
}

export interface AudienceContactsAdded {
  object: "audience_contacts";
  added: number;
  existing: number;
  /** Ids or addresses of no contact. */
  missing: string[];
}

export interface DeletedAudience {
  object: "audience";
  id: string;
  deleted: true;
}

export interface RemovedAudienceContact {
  object: "audience_contact";
  audience_id: string;
  contact_id: string;
  deleted: true;
}

export type SegmentPropertyOperator =
  | "eq"
  | "neq"
  | "in"
  | "not_in"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "contains"
  | "starts_with"
  | "exists"
  | "not_exists";

type Scalar = string | number | boolean;

export type SegmentCondition =
  | {
      field: "property";
      key: string;
      op: SegmentPropertyOperator;
      /** A list for `in`/`not_in`; none for `exists`/`not_exists`. */
      value?: Scalar | Scalar[];
    }
  | { field: "email"; op: "eq" | "ends_with" | "contains"; value: string }
  | { field: "audience"; op: "in" | "not_in"; audience_id: string }
  | { field: "topic"; op: "subscribed" | "not_subscribed"; topic: string }
  | {
      field: "created_at";
      op: "before" | "after" | "within_days";
      /** A timestamp for `before`/`after`, a number of days for `within_days`. */
      value: string | number;
    };

export interface SegmentConditionGroup {
  match: "all" | "any";
  conditions: SegmentCondition[];
}

/** Which contacts belong to a segment: at most 20 conditions, groups nest one level. */
export interface SegmentFilter {
  version: 1;
  /** `all`: every condition must hold; `any`: one is enough. */
  match: "all" | "any";
  conditions: (SegmentCondition | SegmentConditionGroup)[];
}

/** A filter over the environment's contacts, evaluated whenever it is used. */
export interface Segment {
  object: "segment";
  id: string;
  name: string;
  filter: SegmentFilter;
  created_at: string;
  updated_at: string;
}

export interface CreateSegmentParams {
  name: string;
  filter: SegmentFilter;
}

export interface UpdateSegmentParams {
  name?: string;
  filter?: SegmentFilter;
}

export interface DeletedSegment {
  object: "segment";
  id: string;
  deleted: true;
}

/**
 * What contacts subscribe to. Emails sent with `category` equal to `key` are about the topic:
 * `opt_in` topics reach every subscribed contact unless they opt out, `opt_out` topics only
 * those who opted in.
 */
export interface Topic {
  object: "topic";
  id: string;
  key: string;
  name: string;
  description: string | null;
  default_subscription: "opt_in" | "opt_out";
  /** `private` topics never show in the preference center. */
  visibility: "public" | "private";
  /** Order in the preference center. */
  position: number;
  created_at: string;
  updated_at: string;
}

export interface CreateTopicParams {
  key: string;
  name: string;
  description?: string | null;
  default_subscription: "opt_in" | "opt_out";
  visibility?: "public" | "private";
  position?: number;
}

export interface UpdateTopicParams {
  name?: string;
  description?: string | null;
  default_subscription?: "opt_in" | "opt_out";
  visibility?: "public" | "private";
  position?: number;
}

export interface DeletedTopic {
  object: "topic";
  id: string;
  deleted: true;
}

export interface MarketingSettings {
  object: "marketing_settings";
  /** The sender's name in the preference center. */
  display_name: string | null;
  /** The postal address every marketing email carries (CAN-SPAM). */
  mailing_address: string | null;
  /** Whether contacts upserted without `double_opt_in` must confirm first. */
  double_opt_in_default: boolean;
  /** The sender of confirmation emails. */
  confirmation_from: string | null;
  /** `null`: coss.com's defaults. HTML and text must contain `{{{confirmation_url}}}`. */
  confirmation_subject: string | null;
  confirmation_html: string | null;
  confirmation_text: string | null;
  /** Where confirming sends the contact (https); `null`: a coss.com confirmation page. */
  confirmed_redirect_url: string | null;
}

export interface UpdateMarketingSettingsParams {
  display_name?: string | null;
  mailing_address?: string | null;
  double_opt_in_default?: boolean;
  confirmation_from?: string | null;
  confirmation_subject?: string | null;
  confirmation_html?: string | null;
  confirmation_text?: string | null;
  confirmed_redirect_url?: string | null;
}
