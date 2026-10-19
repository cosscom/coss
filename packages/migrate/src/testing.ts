/** Test helpers: a provider whose objects a test sets, paged like the real ones. */
import { ProviderError } from "./http.ts";
import type { ConvertedTemplate } from "./templates/types.ts";
import type {
  Inventory,
  MigrationProvider,
  MigrationSource,
  Page,
  SourceContact,
  SourceDomain,
  SourceList,
  SourceProperty,
  SourceSuppression,
  SourceTemplate,
  SourceTopic,
  SourceWebhook,
} from "./types.ts";

export type FakeSourceData = {
  provider?: MigrationProvider;
  domains?: SourceDomain[];
  properties?: SourceProperty[];
  topics?: SourceTopic[];
  lists?: SourceList[];
  templates?: SourceTemplate[];
  contacts?: SourceContact[];
  members?: Record<string, string[]>;
  suppressions?: SourceSuppression[];
  webhooks?: SourceWebhook[];
  /** Items per page of contacts, members and suppressions. */
  pageSize?: number;
  /** Throws this from every call of a method (`ProviderError("forbidden", …)`, …). */
  fail?: Partial<Record<keyof MigrationSource, Error>>;
  /** Counts calls per method. */
  calls?: Partial<Record<keyof MigrationSource, number>>;
};

/** A template converted without problems. */
export function cleanTemplate(overrides: Partial<ConvertedTemplate> = {}): ConvertedTemplate {
  return {
    subject: "Hello {{name}}",
    html: "<p>Hi {{name}}</p>",
    text: null,
    variables: [{ name: "name", type: "string", required: false }],
    sampleVariables: { name: "Ada" },
    renames: [],
    warnings: [],
    lossless: true,
    ...overrides,
  };
}

function paged<T>(items: T[], cursor: string | null, size: number): Page<T> {
  const start = cursor ? Number(cursor) : 0;
  const end = start + size;
  return { items: items.slice(start, end), next: end < items.length ? String(end) : null };
}

export function fakeSource(data: FakeSourceData = {}): MigrationSource {
  const size = data.pageSize ?? 100;
  const calls = data.calls ?? {};
  function call<K extends keyof MigrationSource>(name: K): void {
    calls[name] = (calls[name] ?? 0) + 1;
    const error = data.fail?.[name];
    if (error) throw error;
  }
  return {
    provider: data.provider ?? "resend",
    async inventory(): Promise<Inventory> {
      call("inventory");
      return {
        account: null,
        domains: data.domains ?? [],
        templates: (data.templates ?? []).map(({ id, name, alias }) => ({ id, name, alias })),
        properties: data.properties ?? [],
        topics: data.topics ?? [],
        lists: data.lists ?? [],
        contacts: { count: data.contacts?.length ?? 0, exact: true },
        suppressions: { count: data.suppressions?.length ?? 0, exact: true },
        webhooks: (data.webhooks ?? []).map(({ id, url, name }) => ({ id, url, name })),
        unavailable: {},
        notes: [],
      };
    },
    async domains() {
      call("domains");
      return data.domains ?? [];
    },
    async properties() {
      call("properties");
      return data.properties ?? [];
    },
    async topics() {
      call("topics");
      return data.topics ?? [];
    },
    async lists() {
      call("lists");
      return data.lists ?? [];
    },
    async templates() {
      call("templates");
      return (data.templates ?? []).map(({ id, name, alias }) => ({ id, name, alias }));
    },
    async template(id) {
      call("template");
      const found = data.templates?.find((template) => template.id === id);
      if (!found) throw new ProviderError("not_found", `No template ${id}.`, 404);
      return found;
    },
    async contacts(cursor) {
      call("contacts");
      return paged(data.contacts ?? [], cursor, size);
    },
    async members(listId, cursor) {
      call("members");
      return paged(data.members?.[listId] ?? [], cursor, size);
    },
    async suppressions(cursor) {
      call("suppressions");
      return paged(data.suppressions ?? [], cursor, size);
    },
    async webhooks() {
      call("webhooks");
      return data.webhooks ?? [];
    },
  };
}
