// Wire mappers of the app's contacts, contact properties, audiences, segments and topics
// (shared by the sibling `audiences`, `segments` and `topics` routes).
import type {
  ContactPropertyType,
  MobileAudience,
  MobileContact,
  MobileContactProperty,
  MobileContactSummary,
  MobileSegmentCondition,
  MobileSegmentItem,
  MobileSegmentSummary,
  MobileTopic,
} from "@coss/companion";
import {
  type ContactEnvironment,
  type ContactPropertyRow,
  listAudiences,
  type TopicRow,
} from "@coss/email";
import type {
  AudienceOutput,
  ContactOutput,
  SegmentConditionOutput,
  SegmentOutput,
} from "@coss/email/contact-schemas";

export function toMobileContactSummary(contact: ContactOutput): MobileContactSummary {
  return {
    id: contact.id,
    email: contact.email,
    name: [contact.first_name, contact.last_name].filter(Boolean).join(" ") || null,
    status: contact.status,
    created_at: contact.created_at,
  };
}

export function toMobileContact(contact: ContactOutput): MobileContact {
  return {
    id: contact.id,
    email: contact.email,
    first_name: contact.first_name,
    last_name: contact.last_name,
    status: contact.status,
    source: contact.source,
    subscribed_at: contact.subscribed_at,
    unsubscribed_at: contact.unsubscribed_at,
    confirmed_at: contact.confirmed_at,
    created_at: contact.created_at,
  };
}

export function toMobileContactProperty(row: ContactPropertyRow): MobileContactProperty {
  return {
    id: row.id,
    key: row.key,
    type: row.type,
    fallback: (row.fallback as string | number | boolean | null | undefined) ?? null,
    created_at: row.createdAt.toISOString(),
  };
}

export function toMobileAudience(audience: AudienceOutput): MobileAudience {
  return {
    id: audience.id,
    name: audience.name,
    contact_count: audience.contact_count,
    created_at: audience.created_at,
  };
}

export function toMobileSegmentSummary(segment: SegmentOutput): MobileSegmentSummary {
  return {
    id: segment.id,
    name: segment.name,
    match: segment.filter.match,
    condition_count: segment.filter.conditions.length,
    updated_at: segment.updated_at,
  };
}

export function toMobileTopic(topic: TopicRow): MobileTopic {
  return {
    id: topic.id,
    key: topic.key,
    name: topic.name,
    description: topic.description,
    default_subscription: topic.defaultSubscription,
    visibility: topic.visibility,
  };
}

/** Every audience of the environment, following the cursors (`listAllAudiences` in `@/lib/marketing`). */
export async function listEveryAudience(env: ContactEnvironment): Promise<AudienceOutput[]> {
  const data: AudienceOutput[] = [];
  let after: string | undefined;
  for (;;) {
    const page = await listAudiences(env, { limit: 100, after });
    data.push(...page.data);
    after = page.data.at(-1)?.id;
    if (!page.has_more || !after) return data;
  }
}

// The words of the dashboard's segment builder (segments/segment-builder.tsx: FIELDS,
// PROPERTY_OPS, OTHER_OPS).
const FIELD_LABELS: Record<SegmentConditionOutput["field"], string> = {
  property: "Property",
  email: "Email",
  audience: "Audience",
  topic: "Topic",
  created_at: "Added",
};

const PROPERTY_OPS: Record<ContactPropertyType, Record<string, string>> = {
  string: {
    eq: "is",
    neq: "is not",
    in: "is one of",
    not_in: "is none of",
    contains: "contains",
    starts_with: "starts with",
    exists: "is set",
    not_exists: "is not set",
  },
  number: {
    eq: "=",
    neq: "≠",
    gt: ">",
    gte: "≥",
    lt: "<",
    lte: "≤",
    in: "is one of",
    not_in: "is none of",
    exists: "is set",
    not_exists: "is not set",
  },
  boolean: { eq: "is", neq: "is not", exists: "is set", not_exists: "is not set" },
  date: {
    gt: "is after",
    gte: "is on or after",
    lt: "is before",
    lte: "is on or before",
    exists: "is set",
    not_exists: "is not set",
  },
};

const OTHER_OPS: Record<
  Exclude<SegmentConditionOutput["field"], "property">,
  Record<string, string>
> = {
  email: { eq: "is", ends_with: "ends with", contains: "contains" },
  audience: { in: "is in", not_in: "is not in" },
  topic: { subscribed: "is subscribed to", not_subscribed: "is not subscribed to" },
  created_at: { within_days: "in the last (days)", after: "after", before: "before" },
};

/** A timestamp at midnight UTC as its day (how the builder shows dates), else as stored. */
function dayOrTimestamp(value: string): string {
  return value.replace(/T00:00:00(\.0+)?Z$/, "");
}

/** Names of what conditions refer to by id or key; unknown ones are shown as stored. */
export type SegmentNames = {
  propertyTypes: ReadonlyMap<string, ContactPropertyType>;
  audiences: ReadonlyMap<string, string>;
  topics: ReadonlyMap<string, string>;
};

function toMobileSegmentCondition(
  condition: SegmentConditionOutput,
  names: SegmentNames,
): MobileSegmentCondition {
  switch (condition.field) {
    case "property": {
      const type = names.propertyTypes.get(condition.key) ?? "string";
      const scalar = (item: string | number | boolean) =>
        type === "date" && typeof item === "string" ? dayOrTimestamp(item) : String(item);
      return {
        field: FIELD_LABELS.property,
        key: condition.key,
        operator: PROPERTY_OPS[type][condition.op] ?? condition.op,
        value:
          condition.value === undefined
            ? null
            : Array.isArray(condition.value)
              ? condition.value.map(scalar).join(", ")
              : scalar(condition.value),
      };
    }
    case "email":
      return {
        field: FIELD_LABELS.email,
        key: null,
        operator: OTHER_OPS.email[condition.op] ?? condition.op,
        value: condition.value,
      };
    case "audience":
      return {
        field: FIELD_LABELS.audience,
        key: null,
        operator: OTHER_OPS.audience[condition.op] ?? condition.op,
        value: names.audiences.get(condition.audience_id) ?? condition.audience_id,
      };
    case "topic":
      return {
        field: FIELD_LABELS.topic,
        key: null,
        operator: OTHER_OPS.topic[condition.op] ?? condition.op,
        value: names.topics.get(condition.topic) ?? condition.topic,
      };
    case "created_at":
      return {
        field: FIELD_LABELS.created_at,
        key: null,
        operator: OTHER_OPS.created_at[condition.op] ?? condition.op,
        value:
          typeof condition.value === "number"
            ? String(condition.value)
            : dayOrTimestamp(condition.value),
      };
  }
}

export function toMobileSegmentItems(
  segment: SegmentOutput,
  names: SegmentNames,
): MobileSegmentItem[] {
  return segment.filter.conditions.map((item) =>
    "conditions" in item
      ? {
          kind: "group",
          match: item.match,
          conditions: item.conditions.map((condition) =>
            toMobileSegmentCondition(condition, names),
          ),
        }
      : { kind: "condition", condition: toMobileSegmentCondition(item, names) },
  );
}
