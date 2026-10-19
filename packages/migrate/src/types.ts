/**
 * What an import reads from another provider, in one shape for every provider. A `MigrationSource`
 * (`src/sources/*.ts`) maps the provider's objects onto these; the runner (`runner.ts`) creates the
 * coss.com objects from them.
 */
import type { ConvertedTemplate } from "./templates/types.ts";

export const MIGRATION_PROVIDERS = ["resend", "sendgrid", "postmark"] as const;
export type MigrationProvider = (typeof MIGRATION_PROVIDERS)[number];

export const PROVIDER_NAMES: Readonly<Record<MigrationProvider, string>> = {
  resend: "Resend",
  sendgrid: "SendGrid",
  postmark: "Postmark",
};

/** What a customer chooses to import. `contacts` brings custom fields, topics and lists along. */
export const MIGRATION_KINDS = [
  "domains",
  "templates",
  "contacts",
  "suppressions",
  "webhooks",
] as const;
export type MigrationKind = (typeof MIGRATION_KINDS)[number];

/** The worker's steps, in order (domains are created by the dashboard when the import starts). */
export const MIGRATION_PHASES = [
  "properties",
  "topics",
  "audiences",
  "templates",
  "contacts",
  "memberships",
  "suppressions",
  "webhooks",
] as const;
export type MigrationPhase = (typeof MIGRATION_PHASES)[number];

export type SourceDomain = { id: string; name: string; verified: boolean };

/** A custom contact field. Contacts' `properties` are keyed by its `id`. */
export type SourceProperty = {
  id: string;
  name: string;
  type: "string" | "number" | "date";
  fallback: string | number | null;
};

export type SourceTopic = {
  id: string;
  name: string;
  description: string | null;
  defaultSubscription: "opt_in" | "opt_out";
  visibility: "public" | "private";
};

export type SourceList = { id: string; name: string; contactCount: number | null };

export type SourceTemplateSummary = { id: string; name: string; alias: string | null };

export type SourceTemplate = SourceTemplateSummary & {
  converted: ConvertedTemplate;
  /** What the provider's template had that coss.com templates don't (a from address, a layout). */
  notes: string[];
};

export type SourceContact = {
  email: string;
  firstName: string | null;
  lastName: string | null;
  unsubscribed: boolean;
  /** By `SourceProperty.id`. */
  properties: Record<string, string | number | null>;
  topics: { topicId: string; status: "opted_in" | "opted_out" }[];
};

export type SuppressionScope =
  | { kind: "all" }
  | { kind: "marketing" }
  | { kind: "topic"; topicId: string };

export type SourceSuppression = {
  address: string;
  scope: SuppressionScope;
  reason: "bounce" | "complaint" | "manual" | "unsubscribe";
  createdAt: Date | null;
};

export type SourceWebhook = {
  id: string;
  url: string;
  name: string;
  /** coss.com event types the provider's events map to. */
  eventTypes: string[];
  /** The provider's events coss.com has nothing for. */
  unmapped: string[];
  /** Approximations and what can't be carried over (custom headers, credentials). */
  notes: string[];
};

/**
 * A page of a long list. `next` is the opaque cursor of the following page (`null`: done).
 * `retryAt` asks to come back later with `next` (an export still being prepared).
 */
export type Page<T> = { items: T[]; next: string | null; retryAt?: Date | undefined };

export type Count = { count: number; exact: boolean };

/** What the provider has, shown before the customer chooses what to import. */
export type Inventory = {
  /** The account or server read (Postmark's server name). */
  account: string | null;
  domains: SourceDomain[];
  templates: SourceTemplateSummary[];
  properties: SourceProperty[];
  topics: SourceTopic[];
  lists: SourceList[];
  contacts: Count | null;
  suppressions: Count | null;
  webhooks: { id: string; url: string; name: string }[];
  /** Why a kind can't be imported (a missing permission, not offered by the provider). */
  unavailable: Partial<Record<MigrationKind, string>>;
  notes: string[];
};

export interface MigrationSource {
  readonly provider: MigrationProvider;
  /** Reads what there is; counts that would take longer than `deadline` (epoch ms) are estimates. */
  inventory(deadline: number): Promise<Inventory>;
  domains(): Promise<SourceDomain[]>;
  properties(): Promise<SourceProperty[]>;
  topics(): Promise<SourceTopic[]>;
  lists(): Promise<SourceList[]>;
  templates(): Promise<SourceTemplateSummary[]>;
  template(id: string): Promise<SourceTemplate>;
  contacts(cursor: string | null): Promise<Page<SourceContact>>;
  /** The addresses on a list. */
  members(listId: string, cursor: string | null): Promise<Page<string>>;
  suppressions(cursor: string | null): Promise<Page<SourceSuppression>>;
  webhooks(): Promise<SourceWebhook[]>;
}

/** Provider-specific details of a connection, stored on the migration (`migration.source`). */
export type SourceOptions = {
  /** SendGrid: EU regional subusers' keys only work on the EU host. */
  region?: "global" | "eu" | undefined;
  /** Postmark: an account token reads every server (one is imported), a server token only its own. */
  tokenType?: "account" | "server" | undefined;
  serverId?: number | undefined;
  serverName?: string | undefined;
};

export type SourceConfig = {
  provider: MigrationProvider;
  apiKey: string;
  options: SourceOptions;
};
