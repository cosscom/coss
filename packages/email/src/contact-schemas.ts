/**
 * Public wire schemas of contacts, custom properties, audiences, segments, topics and marketing
 * settings (snake_case). Plain zod like `schemas.ts` (no database imports): exported through
 * `@coss/email/schemas`.
 */
import { LATEST_API_VERSION } from "@coss/versioning";
import { z } from "zod";
import { CONTACT_EVENT_TYPES } from "./contact-event-types.ts";
import { Category, SuppressionAddress } from "./schemas.ts";

export { CONTACT_EVENT_TYPES, type ContactEventType } from "./contact-event-types.ts";

/** Custom properties per environment. */
export const MAX_CONTACT_PROPERTIES = 50;
/** Serialized size of one contact's custom properties. */
export const MAX_CONTACT_PROPERTIES_BYTES = 16 * 1024;
/** Contacts per `POST /v1/contacts/import` request (the SDK and the dashboard batch). */
export const MAX_CONTACT_IMPORT_ENTRIES = 1000;
/** Contacts added to an audience per request. */
export const MAX_AUDIENCE_CONTACTS_PER_REQUEST = 1000;
/** Audiences a contact can be added to in one upsert. */
export const MAX_CONTACT_AUDIENCES = 20;
/** Conditions in one segment filter, counting nested groups' (groups nest one level). */
export const MAX_SEGMENT_CONDITIONS = 20;
export const DEFAULT_CONTACT_LIST_LIMIT = 50;
export const MAX_CONTACT_LIST_LIMIT = 100;
export const CONTACT_NAME_MAX_LENGTH = 256;
const STRING_PROPERTY_MAX_LENGTH = 2000;
const LIST_NAME_MAX_LENGTH = 200;
const TOPIC_DESCRIPTION_MAX_LENGTH = 500;
export const MAILING_ADDRESS_MAX_LENGTH = 500;

export const CONTACT_STATUSES = ["subscribed", "unsubscribed", "pending"] as const;
export type ContactStatus = (typeof CONTACT_STATUSES)[number];
export const CONTACT_SOURCES = ["api", "dashboard", "import", "preference_center"] as const;
export type ContactSource = (typeof CONTACT_SOURCES)[number];
export const CONTACT_PROPERTY_TYPES = ["string", "number", "boolean", "date"] as const;
export type ContactPropertyType = (typeof CONTACT_PROPERTY_TYPES)[number];
export const TOPIC_DEFAULT_SUBSCRIPTIONS = ["opt_in", "opt_out"] as const;
export const TOPIC_VISIBILITIES = ["public", "private"] as const;
export const CONTACT_TOPIC_STATUSES = ["opted_in", "opted_out"] as const;
export type ContactTopicStatus = (typeof CONTACT_TOPIC_STATUSES)[number];

/** `^[a-z][a-z0-9_]{0,49}$`: usable as `{{{contact.<key>}}}` in templates. */
export const CONTACT_PROPERTY_KEY = /^[a-z][a-z0-9_]{0,49}$/;
/** Keys of the built-in fields, which custom properties can't take. */
export const RESERVED_PROPERTY_KEYS: ReadonlySet<string> = new Set([
  "email",
  "first_name",
  "last_name",
  "id",
  "status",
]);

const Timestamp = z.iso.datetime();
const NullableTimestamp = Timestamp.nullable();

const ContactEmail = SuppressionAddress.meta({
  description: "The contact's address. Display names are ignored; matching is case-insensitive.",
  examples: ["ada@example.com"],
});

const PersonName = z
  .string()
  .trim()
  .min(1)
  .max(CONTACT_NAME_MAX_LENGTH)
  .refine((value) => !/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u.test(value), {
    message: "Must not contain control or invisible formatting characters.",
  });

/**
 * A property value as sent: strings (dates as ISO 8601 strings), numbers and booleans; `null`
 * removes the property. Values are checked against the property's type on write.
 */
export const ContactPropertyValue = z.union([
  z.string().max(STRING_PROPERTY_MAX_LENGTH),
  z.number(),
  z.boolean(),
  z.null(),
]);
export type ContactPropertyValueOutput = z.output<typeof ContactPropertyValue>;

const PropertyKey = z
  .string()
  .regex(
    CONTACT_PROPERTY_KEY,
    "Must start with a lower-case letter and contain only a-z, 0-9 and _ (at most 50).",
  )
  .refine((value) => !RESERVED_PROPERTY_KEYS.has(value), {
    message: "This key is reserved for a built-in field.",
  });

const ContactProperties = z.record(z.string(), ContactPropertyValue).meta({
  description:
    "Custom properties by key (define them first, see contact properties). Merged into the " +
    "contact's existing properties; `null` removes one.",
  examples: [{ plan: "pro", seats: 5 }],
});

const TopicChoice = z.strictObject({
  topic: Category.meta({ description: "The topic's key." }),
  status: z.enum(CONTACT_TOPIC_STATUSES),
});

const CONTACT_ID_EXAMPLE = "contact_01k7c8m4q2f3e9v6t5r1n0p8yz";
const CONTACT_EXAMPLE = {
  object: "contact",
  id: CONTACT_ID_EXAMPLE,
  email: "ada@example.com",
  first_name: "Ada",
  last_name: "Lovelace",
  status: "subscribed",
  properties: { plan: "pro", seats: 5 },
  source: "api",
  subscribed_at: "2026-10-10T12:00:00.000Z",
  unsubscribed_at: null,
  confirmed_at: null,
  created_at: "2026-10-10T12:00:00.000Z",
  updated_at: "2026-10-10T12:00:00.000Z",
} as const;

export const Contact = z
  .object({
    object: z.literal("contact"),
    id: z.string(),
    email: z.string(),
    first_name: z.string().nullable(),
    last_name: z.string().nullable(),
    status: z.enum(CONTACT_STATUSES).meta({
      description:
        "Consent to marketing email: `subscribed`, `unsubscribed` (never receives marketing " +
        "email; transactional email is unaffected) or `pending` (waiting for a double opt-in " +
        "confirmation).",
    }),
    properties: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
    source: z.enum(CONTACT_SOURCES).meta({ description: "How the contact was created." }),
    subscribed_at: NullableTimestamp,
    unsubscribed_at: NullableTimestamp,
    confirmed_at: NullableTimestamp.meta({
      description: "When the contact confirmed a double opt-in.",
    }),
    created_at: Timestamp,
    updated_at: Timestamp,
  })
  .meta({ id: "Contact", examples: [CONTACT_EXAMPLE] });
export type ContactOutput = z.output<typeof Contact>;

export const ContactList = z
  .object({ object: z.literal("list"), data: z.array(Contact), has_more: z.boolean() })
  .meta({
    id: "ContactList",
    examples: [{ object: "list", data: [CONTACT_EXAMPLE], has_more: false }],
  });
export type ContactListOutput = z.output<typeof ContactList>;

const ContactFields = {
  first_name: PersonName.nullable().optional(),
  last_name: PersonName.nullable().optional(),
  properties: ContactProperties.optional(),
  status: z
    .enum(["subscribed", "unsubscribed"])
    .optional()
    .meta({
      description:
        "Sets the contact's consent. Omitted, a new contact is `subscribed` and an existing one " +
        "keeps its status.",
    }),
};

export const UpsertContactRequest = z
  .strictObject({
    email: ContactEmail,
    ...ContactFields,
    audience_ids: z
      .array(z.string())
      .max(MAX_CONTACT_AUDIENCES)
      .optional()
      .meta({ description: "Audiences to add the contact to (it stays in the others)." }),
    topics: z
      .array(TopicChoice)
      .max(100)
      .optional()
      .meta({ description: "Choices per topic; topics left out keep the contact's choice." }),
  })
  .meta({
    id: "UpsertContactRequest",
    examples: [
      {
        email: "ada@example.com",
        first_name: "Ada",
        properties: { plan: "pro" },
        topics: [{ topic: "newsletter", status: "opted_in" }],
      },
    ],
  });
export type UpsertContactRequestOutput = z.output<typeof UpsertContactRequest>;

export const UpdateContactRequest = z
  .strictObject({
    ...ContactFields,
    topics: UpsertContactRequest.shape.topics,
  })
  .meta({
    id: "UpdateContactRequest",
    examples: [{ last_name: "Byron", properties: { seats: null } }],
  });
export type UpdateContactRequestOutput = z.output<typeof UpdateContactRequest>;

export const ListContactsQuery = z.strictObject({
  email: SuppressionAddress.optional().meta({ description: "Only the contact with this address." }),
  status: z.enum(CONTACT_STATUSES).optional(),
  audience_id: z.string().optional().meta({ description: "Only members of this audience." }),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_CONTACT_LIST_LIMIT)
    .optional()
    .meta({ description: `1-${MAX_CONTACT_LIST_LIMIT}, default ${DEFAULT_CONTACT_LIST_LIMIT}.` }),
  after: z
    .string()
    .optional()
    .meta({ description: "Cursor: the `id` of the last contact of the previous page." }),
});
export type ListContactsQueryOutput = z.output<typeof ListContactsQuery>;

export const ExportContactsQuery = ListContactsQuery.pick({ status: true, audience_id: true });
export type ExportContactsQueryOutput = z.output<typeof ExportContactsQuery>;

export const ContactImportEntry = z.strictObject({
  email: z.string().meta({ description: "The contact's address (validated on its own)." }),
  ...ContactFields,
});
export type ContactImportEntryInput = z.input<typeof ContactImportEntry>;

export const ImportContactsRequest = z
  .strictObject({
    contacts: z.array(ContactImportEntry).min(1).max(MAX_CONTACT_IMPORT_ENTRIES),
    audience_id: z
      .string()
      .optional()
      .meta({ description: "Adds every imported contact to this audience." }),
  })
  .meta({
    id: "ImportContactsRequest",
    examples: [
      {
        contacts: [
          { email: "ada@example.com", first_name: "Ada", properties: { plan: "pro" } },
          { email: "grace@example.com", status: "unsubscribed" },
        ],
      },
    ],
  });

export const ContactImport = z
  .object({
    object: z.literal("contact_import"),
    created: z.int(),
    updated: z.int(),
    kept_unsubscribed: z.int().meta({
      description:
        "Existing contacts the import marked `subscribed` that stay `unsubscribed`: an import " +
        "never re-subscribes anyone.",
    }),
    invalid: z.array(z.object({ index: z.int(), email: z.string(), message: z.string() })),
  })
  .meta({
    id: "ContactImport",
    examples: [
      {
        object: "contact_import",
        created: 1,
        updated: 1,
        kept_unsubscribed: 0,
        invalid: [{ index: 2, email: "not-an-address", message: "Must be an email address." }],
      },
    ],
  });
export type ContactImportOutput = z.output<typeof ContactImport>;

export const DeletedContact = z
  .object({ object: z.literal("contact"), id: z.string(), deleted: z.literal(true) })
  .meta({
    id: "DeletedContact",
    examples: [{ object: "contact", id: CONTACT_ID_EXAMPLE, deleted: true }],
  });

export const ContactTopics = z
  .object({
    object: z.literal("contact_topics"),
    contact_id: z.string(),
    topics: z.array(
      z.object({
        topic: z.string(),
        name: z.string(),
        subscribed: z.boolean().meta({
          description:
            "Whether emails about the topic reach the contact (its choice, else the topic's " +
            "default; an unsubscribed contact gets no marketing email at all).",
        }),
        choice: z.enum(CONTACT_TOPIC_STATUSES).nullable().meta({
          description: "The contact's explicit choice; `null`: the topic's default applies.",
        }),
      }),
    ),
  })
  .meta({
    id: "ContactTopics",
    examples: [
      {
        object: "contact_topics",
        contact_id: CONTACT_ID_EXAMPLE,
        topics: [
          { topic: "newsletter", name: "Newsletter", subscribed: true, choice: null },
          { topic: "product", name: "Product updates", subscribed: false, choice: "opted_out" },
        ],
      },
    ],
  });
export type ContactTopicsOutput = z.output<typeof ContactTopics>;

export const UpdateContactTopicsRequest = z
  .strictObject({ topics: z.array(TopicChoice).min(1).max(100) })
  .meta({
    id: "UpdateContactTopicsRequest",
    examples: [{ topics: [{ topic: "product", status: "opted_out" }] }],
  });

// ---------------------------------------------------------------------------------------------
// Custom properties
// ---------------------------------------------------------------------------------------------

const PROPERTY_EXAMPLE = {
  object: "contact_property",
  id: "cprop_01k7c8m4q2f3e9v6t5r1n0p8yz",
  key: "plan",
  type: "string",
  fallback: "free",
  created_at: "2026-10-10T12:00:00.000Z",
  updated_at: "2026-10-10T12:00:00.000Z",
} as const;

export const ContactPropertyObject = z
  .object({
    object: z.literal("contact_property"),
    id: z.string(),
    key: z.string(),
    type: z.enum(CONTACT_PROPERTY_TYPES).meta({
      description: "`date` values are ISO 8601 strings.",
    }),
    fallback: z.union([z.string(), z.number(), z.boolean(), z.null()]).meta({
      description: "Used in templates for contacts without a value.",
    }),
    created_at: Timestamp,
    updated_at: Timestamp,
  })
  .meta({ id: "ContactProperty", examples: [PROPERTY_EXAMPLE] });
export type ContactPropertyObjectOutput = z.output<typeof ContactPropertyObject>;

export const ContactPropertyList = z
  .object({
    object: z.literal("list"),
    data: z.array(ContactPropertyObject),
    has_more: z.boolean(),
  })
  .meta({
    id: "ContactPropertyList",
    examples: [{ object: "list", data: [PROPERTY_EXAMPLE], has_more: false }],
  });

export const CreateContactPropertyRequest = z
  .strictObject({
    key: PropertyKey,
    type: z.enum(CONTACT_PROPERTY_TYPES),
    fallback: ContactPropertyValue.optional(),
  })
  .meta({
    id: "CreateContactPropertyRequest",
    examples: [{ key: "plan", type: "string", fallback: "free" }],
  });
export type CreateContactPropertyRequestOutput = z.output<typeof CreateContactPropertyRequest>;

export const UpdateContactPropertyRequest = z
  .strictObject({ fallback: ContactPropertyValue })
  .meta({ id: "UpdateContactPropertyRequest", examples: [{ fallback: "starter" }] });

export const DeletedContactProperty = z
  .object({ object: z.literal("contact_property"), id: z.string(), deleted: z.literal(true) })
  .meta({
    id: "DeletedContactProperty",
    examples: [{ object: "contact_property", id: PROPERTY_EXAMPLE.id, deleted: true }],
  });

// ---------------------------------------------------------------------------------------------
// Audiences (static lists)
// ---------------------------------------------------------------------------------------------

const ListName = z.string().trim().min(1).max(LIST_NAME_MAX_LENGTH);

const AUDIENCE_EXAMPLE = {
  object: "audience",
  id: "aud_01k7c8m4q2f3e9v6t5r1n0p8yz",
  name: "Beta testers",
  contact_count: 42,
  created_at: "2026-10-10T12:00:00.000Z",
  updated_at: "2026-10-10T12:00:00.000Z",
} as const;

export const Audience = z
  .object({
    object: z.literal("audience"),
    id: z.string(),
    name: z.string(),
    contact_count: z.int().meta({ description: "Members, whatever their status." }),
    created_at: Timestamp,
    updated_at: Timestamp,
  })
  .meta({ id: "Audience", examples: [AUDIENCE_EXAMPLE] });
export type AudienceOutput = z.output<typeof Audience>;

export const AudienceList = z
  .object({ object: z.literal("list"), data: z.array(Audience), has_more: z.boolean() })
  .meta({
    id: "AudienceList",
    examples: [{ object: "list", data: [AUDIENCE_EXAMPLE], has_more: false }],
  });

export const ListQuery = z.strictObject({
  limit: ListContactsQuery.shape.limit,
  after: z
    .string()
    .optional()
    .meta({ description: "Cursor: the `id` of the last item of the previous page." }),
});
export type ListQueryOutput = z.output<typeof ListQuery>;

export const CreateAudienceRequest = z
  .strictObject({ name: ListName })
  .meta({ id: "CreateAudienceRequest", examples: [{ name: "Beta testers" }] });

export const UpdateAudienceRequest = CreateAudienceRequest.meta({
  id: "UpdateAudienceRequest",
  examples: [{ name: "Early access" }],
});

export const AddAudienceContactsRequest = z
  .strictObject({
    contacts: z
      .array(z.string())
      .min(1)
      .max(MAX_AUDIENCE_CONTACTS_PER_REQUEST)
      .meta({ description: "Contact ids or addresses of existing contacts." }),
  })
  .meta({
    id: "AddAudienceContactsRequest",
    examples: [{ contacts: [CONTACT_ID_EXAMPLE, "grace@example.com"] }],
  });

export const AudienceContactsAdded = z
  .object({
    object: z.literal("audience_contacts"),
    added: z.int(),
    existing: z.int(),
    missing: z.array(z.string()).meta({ description: "Ids or addresses of no contact." }),
  })
  .meta({
    id: "AudienceContactsAdded",
    examples: [{ object: "audience_contacts", added: 1, existing: 0, missing: [] }],
  });

export const DeletedAudience = z
  .object({ object: z.literal("audience"), id: z.string(), deleted: z.literal(true) })
  .meta({
    id: "DeletedAudience",
    examples: [{ object: "audience", id: AUDIENCE_EXAMPLE.id, deleted: true }],
  });

// ---------------------------------------------------------------------------------------------
// Segments (filters, evaluated whenever a segment is used)
// ---------------------------------------------------------------------------------------------

export const PROPERTY_OPERATORS = [
  "eq",
  "neq",
  "in",
  "not_in",
  "gt",
  "gte",
  "lt",
  "lte",
  "contains",
  "starts_with",
  "exists",
  "not_exists",
] as const;
export type PropertyOperator = (typeof PROPERTY_OPERATORS)[number];

const Scalar = z.union([z.string().max(STRING_PROPERTY_MAX_LENGTH), z.number(), z.boolean()]);

const PropertyCondition = z.strictObject({
  field: z.literal("property"),
  key: z.string(),
  op: z.enum(PROPERTY_OPERATORS),
  value: z
    .union([Scalar, z.array(Scalar).min(1).max(100)])
    .optional()
    .meta({ description: "A list for `in`/`not_in`; none for `exists`/`not_exists`." }),
});

const EmailCondition = z.strictObject({
  field: z.literal("email"),
  op: z.enum(["eq", "ends_with", "contains"]),
  value: z.string().min(1).max(254),
});

const AudienceCondition = z.strictObject({
  field: z.literal("audience"),
  op: z.enum(["in", "not_in"]),
  audience_id: z.string(),
});

const TopicCondition = z.strictObject({
  field: z.literal("topic"),
  op: z.enum(["subscribed", "not_subscribed"]),
  topic: Category,
});

const CreatedAtCondition = z.strictObject({
  field: z.literal("created_at"),
  op: z.enum(["before", "after", "within_days"]),
  value: z.union([Timestamp, z.int().min(1).max(3650)]).meta({
    description: "A timestamp for `before`/`after`, a number of days for `within_days`.",
  }),
});

export const SegmentCondition = z.discriminatedUnion("field", [
  PropertyCondition,
  EmailCondition,
  AudienceCondition,
  TopicCondition,
  CreatedAtCondition,
]);
export type SegmentConditionOutput = z.output<typeof SegmentCondition>;

const Match = z.enum(["all", "any"]);

const SegmentGroup = z.strictObject({
  match: Match,
  conditions: z.array(SegmentCondition).min(1),
});

export const SegmentFilter = z
  .strictObject({
    version: z.literal(1),
    match: Match.meta({ description: "`all`: every condition must hold; `any`: one is enough." }),
    conditions: z.array(z.union([SegmentCondition, SegmentGroup])).min(1),
  })
  .refine(
    (filter) =>
      filter.conditions.reduce(
        (total, item) => total + ("conditions" in item ? item.conditions.length : 1),
        0,
      ) <= MAX_SEGMENT_CONDITIONS,
    { message: `A filter can have at most ${MAX_SEGMENT_CONDITIONS} conditions.` },
  )
  .meta({
    id: "SegmentFilter",
    description:
      "Which contacts belong to the segment. Conditions on `property` (custom properties), " +
      "`email`, `audience` membership, `topic` subscription and `created_at`; one level of " +
      "nested `{ match, conditions }` groups.",
  });
export type SegmentFilterOutput = z.output<typeof SegmentFilter>;

const SEGMENT_FILTER_EXAMPLE = {
  version: 1,
  match: "all",
  conditions: [
    { field: "property", key: "plan", op: "eq", value: "pro" },
    {
      match: "any",
      conditions: [
        { field: "email", op: "ends_with", value: "@acme.com" },
        { field: "audience", op: "in", audience_id: AUDIENCE_EXAMPLE.id },
      ],
    },
  ],
} as const;

const SEGMENT_EXAMPLE = {
  object: "segment",
  id: "seg_01k7c8m4q2f3e9v6t5r1n0p8yz",
  name: "Pro customers",
  filter: SEGMENT_FILTER_EXAMPLE,
  created_at: "2026-10-10T12:00:00.000Z",
  updated_at: "2026-10-10T12:00:00.000Z",
} as const;

export const Segment = z
  .object({
    object: z.literal("segment"),
    id: z.string(),
    name: z.string(),
    filter: SegmentFilter,
    created_at: Timestamp,
    updated_at: Timestamp,
  })
  .meta({ id: "Segment", examples: [SEGMENT_EXAMPLE] });
export type SegmentOutput = z.output<typeof Segment>;

export const SegmentList = z
  .object({ object: z.literal("list"), data: z.array(Segment), has_more: z.boolean() })
  .meta({
    id: "SegmentList",
    examples: [{ object: "list", data: [SEGMENT_EXAMPLE], has_more: false }],
  });

export const CreateSegmentRequest = z.strictObject({ name: ListName, filter: SegmentFilter }).meta({
  id: "CreateSegmentRequest",
  examples: [{ name: "Pro customers", filter: SEGMENT_FILTER_EXAMPLE }],
});

export const UpdateSegmentRequest = z
  .strictObject({ name: ListName.optional(), filter: SegmentFilter.optional() })
  .meta({ id: "UpdateSegmentRequest", examples: [{ name: "Pro and Scale customers" }] });

export const DeletedSegment = z
  .object({ object: z.literal("segment"), id: z.string(), deleted: z.literal(true) })
  .meta({
    id: "DeletedSegment",
    examples: [{ object: "segment", id: SEGMENT_EXAMPLE.id, deleted: true }],
  });

// ---------------------------------------------------------------------------------------------
// Topics (built on categories)
// ---------------------------------------------------------------------------------------------

const TOPIC_EXAMPLE = {
  object: "topic",
  id: "topic_01k7c8m4q2f3e9v6t5r1n0p8yz",
  key: "newsletter",
  name: "Newsletter",
  description: "Monthly product news.",
  default_subscription: "opt_in",
  visibility: "public",
  position: 0,
  created_at: "2026-10-10T12:00:00.000Z",
  updated_at: "2026-10-10T12:00:00.000Z",
} as const;

const TopicFields = {
  name: ListName,
  description: z.string().trim().max(TOPIC_DESCRIPTION_MAX_LENGTH).nullable().optional(),
  default_subscription: z.enum(TOPIC_DEFAULT_SUBSCRIPTIONS).meta({
    description:
      "`opt_in`: every subscribed contact gets the topic's emails unless they opt out. " +
      "`opt_out`: only contacts who opted in do.",
  }),
  visibility: z.enum(TOPIC_VISIBILITIES).optional().meta({
    description: "`private` topics never show in the preference center (default `public`).",
  }),
  position: z.int().min(0).max(1000).optional().meta({
    description: "Order in the preference center (ascending).",
  }),
};

export const Topic = z
  .object({
    object: z.literal("topic"),
    id: z.string(),
    key: z.string().meta({
      description: "The `category` of the emails about this topic. Can't change.",
    }),
    name: z.string(),
    description: z.string().nullable(),
    default_subscription: z.enum(TOPIC_DEFAULT_SUBSCRIPTIONS),
    visibility: z.enum(TOPIC_VISIBILITIES),
    position: z.int(),
    created_at: Timestamp,
    updated_at: Timestamp,
  })
  .meta({ id: "Topic", examples: [TOPIC_EXAMPLE] });
export type TopicOutput = z.output<typeof Topic>;

export const TopicList = z
  .object({ object: z.literal("list"), data: z.array(Topic), has_more: z.boolean() })
  .meta({
    id: "TopicList",
    examples: [{ object: "list", data: [TOPIC_EXAMPLE], has_more: false }],
  });

export const CreateTopicRequest = z.strictObject({ key: Category, ...TopicFields }).meta({
  id: "CreateTopicRequest",
  examples: [{ key: "newsletter", name: "Newsletter", default_subscription: "opt_in" }],
});

export const UpdateTopicRequest = z
  .strictObject({
    name: TopicFields.name.optional(),
    description: TopicFields.description,
    default_subscription: TopicFields.default_subscription.optional(),
    visibility: TopicFields.visibility,
    position: TopicFields.position,
  })
  .meta({ id: "UpdateTopicRequest", examples: [{ visibility: "private" }] });

export const DeletedTopic = z
  .object({ object: z.literal("topic"), id: z.string(), deleted: z.literal(true) })
  .meta({
    id: "DeletedTopic",
    examples: [{ object: "topic", id: TOPIC_EXAMPLE.id, deleted: true }],
  });

// ---------------------------------------------------------------------------------------------
// Marketing settings
// ---------------------------------------------------------------------------------------------

const MARKETING_SETTINGS_EXAMPLE = {
  object: "marketing_settings",
  display_name: "Acme",
  mailing_address: "Acme Inc., 548 Market St, San Francisco, CA 94104, USA",
} as const;

export const MarketingSettings = z
  .object({
    object: z.literal("marketing_settings"),
    display_name: z.string().nullable().meta({
      description: "The sender's name in the preference center (default: the organization's).",
    }),
    mailing_address: z
      .string()
      .nullable()
      .meta({
        description:
          "The postal address every marketing email carries (CAN-SPAM). Marketing emails can't " +
          "be sent without one.",
      }),
  })
  .meta({ id: "MarketingSettings", examples: [MARKETING_SETTINGS_EXAMPLE] });
export type MarketingSettingsOutput = z.output<typeof MarketingSettings>;

export const UpdateMarketingSettingsRequest = z
  .strictObject({
    display_name: z.string().trim().min(1).max(LIST_NAME_MAX_LENGTH).nullable().optional(),
    mailing_address: z
      .string()
      .trim()
      .min(1)
      .max(MAILING_ADDRESS_MAX_LENGTH)
      .refine((value) => !/[\p{Cc}\p{Cf}]/u.test(value.replaceAll("\n", "")), {
        message: "Must not contain control or invisible formatting characters.",
      })
      .nullable()
      .optional(),
  })
  .meta({
    id: "UpdateMarketingSettingsRequest",
    examples: [{ mailing_address: MARKETING_SETTINGS_EXAMPLE.mailing_address }],
  });

// ---------------------------------------------------------------------------------------------
// Webhooks
// ---------------------------------------------------------------------------------------------

/** Body of a `contact.*` webhook request: who changed, never their properties or names. */
export const ContactWebhookEvent = z
  .object({
    id: z.string().meta({
      description: "The event id, and the `webhook-id` header.",
      examples: ["evt_01k7c8m4r0c2b8w9y3d5f6g7h9"],
    }),
    object: z.literal("event"),
    type: z.enum(CONTACT_EVENT_TYPES),
    api_version: z.string().meta({
      description:
        "The API version (`Coss-Version`) this event is rendered in: the receiving endpoint's `api_version`.",
      examples: [LATEST_API_VERSION],
    }),
    created_at: Timestamp,
    data: z.object({
      contact: z.object({
        id: z.string(),
        email: z.string(),
        status: z.enum(CONTACT_STATUSES),
      }),
      source: z.enum(CONTACT_SOURCES),
      occurred_at: Timestamp,
    }),
  })
  .meta({
    id: "ContactWebhookEvent",
    examples: [
      {
        id: "evt_01k7c8m4r0c2b8w9y3d5f6g7h9",
        object: "event",
        type: "contact.created",
        api_version: LATEST_API_VERSION,
        created_at: "2026-10-10T12:00:00.000Z",
        data: {
          contact: { id: CONTACT_ID_EXAMPLE, email: "ada@example.com", status: "subscribed" },
          source: "api",
          occurred_at: "2026-10-10T12:00:00.000Z",
        },
      },
    ],
  });
export type ContactWebhookEventOutput = z.output<typeof ContactWebhookEvent>;
/** What the outbox stores: delivery adds `api_version` when it renders the event for an endpoint. */
export type StoredContactWebhookEvent = Omit<ContactWebhookEventOutput, "api_version">;
