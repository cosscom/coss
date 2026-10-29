// Contacts, their properties, audiences, segments and topics.

import type { Page } from "./index.ts";

export type ContactStatus = "subscribed" | "unsubscribed" | "pending";

export type ContactSource = "api" | "dashboard" | "import" | "preference_center" | "form";

export type ContactPropertyType = "string" | "number" | "boolean" | "date";

export type MobileContactSummary = {
  id: string;
  email: string;
  /** First and last name joined; null without either. */
  name: string | null;
  status: ContactStatus;
  created_at: string;
};

/** `GET …/contacts?email=&status=&after=`: newest first. */
export type ContactsResponse = Page<MobileContactSummary> & {
  /** Every contact of the environment, whatever the filters. */
  total: number;
  /** The `email` searched for isn't a valid address (nothing was searched). */
  invalid_email: boolean;
};

export type MobileContact = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  status: ContactStatus;
  source: ContactSource;
  subscribed_at: string | null;
  unsubscribed_at: string | null;
  confirmed_at: string | null;
  created_at: string;
};

/** A property definition of the environment with the contact's value (null: none). */
export type MobileContactPropertyValue = {
  key: string;
  type: ContactPropertyType;
  value: string | number | boolean | null;
};

export type MobileContactTopic = {
  /** The topic's key. */
  topic: string;
  name: string;
  choice: "opted_in" | "opted_out" | null;
  /** Whether the topic's emails reach the contact now. */
  subscribed: boolean;
};

export type MobileContactAudience = { id: string; name: string; member: boolean };

/** `GET …/contacts/{contactId}`. */
export type ContactResponse = {
  contact: MobileContact;
  properties: MobileContactPropertyValue[];
  topics: MobileContactTopic[];
  audiences: MobileContactAudience[];
};

export type MobileContactProperty = {
  id: string;
  key: string;
  type: ContactPropertyType;
  fallback: string | number | boolean | null;
  created_at: string;
};

/** `GET …/contacts/properties` (at most 50, by key). */
export type ContactPropertiesResponse = { data: MobileContactProperty[] };

export type MobileAudience = {
  id: string;
  name: string;
  /** Members, whatever their status. */
  contact_count: number;
  created_at: string;
};

/** `GET …/audiences?after=`: newest first. */
export type AudiencesResponse = Page<MobileAudience>;

export type MobileAudienceMember = { id: string; email: string; status: ContactStatus };

/** `GET …/audiences/{audienceId}?after=`: the audience and a page of its members. */
export type AudienceResponse = {
  audience: MobileAudience;
  members: Page<MobileAudienceMember>;
};

export type SegmentMatch = "all" | "any";

export type MobileSegmentSummary = {
  id: string;
  name: string;
  match: SegmentMatch;
  /** Top-level conditions (a nested group counts once), as the dashboard's list shows. */
  condition_count: number;
  updated_at: string;
};

/** `GET …/segments?after=`: newest first. */
export type SegmentsResponse = Page<MobileSegmentSummary>;

/** A condition written out in the dashboard's segment builder's words. */
export type MobileSegmentCondition = {
  /** "Property", "Email", "Audience", "Topic" or "Added". */
  field: string;
  /** The property's key (property conditions only). */
  key: string | null;
  /** E.g. "is", "≥", "ends with", "is not subscribed to", "in the last (days)". */
  operator: string;
  /** The value as text (lists joined with ", ", audiences and topics by name); null for none. */
  value: string | null;
};

export type MobileSegmentItem =
  | { kind: "condition"; condition: MobileSegmentCondition }
  | { kind: "group"; match: SegmentMatch; conditions: MobileSegmentCondition[] };

export type MobileSegment = {
  id: string;
  name: string;
  match: SegmentMatch;
  conditions: MobileSegmentItem[];
  created_at: string;
  updated_at: string;
};

/** `GET …/segments/{segmentId}`: the filter and the contacts it matches now. */
export type SegmentResponse = {
  segment: MobileSegment;
  /** Contacts matching now, whatever their status; null when the filter can't be evaluated. */
  count: number | null;
  /** A few matching addresses, newest first. */
  sample: string[];
};

export type MobileTopic = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  default_subscription: "opt_in" | "opt_out";
  visibility: "public" | "private";
};

/** `GET …/topics`: in preference-center order. */
export type TopicsResponse = { data: MobileTopic[] };
