/**
 * Resend (https://resend.com/docs/api-reference). One API key per team, sharing a rate limit of
 * 10 requests a second with the team's sending, so imports go at about 4. Lists are cursor paged
 * (`limit` ≤ 100, `after`). Contacts are global, segments are static lists, and a contact's
 * properties and topic choices each take a request of their own: contacts are read in small pages.
 * `/suppressions` is a private beta, so a 403 or 404 there means "none to import".
 */

import { ProviderError, providerClient } from "../http.ts";
import { mapResendEvents } from "../mapping/events.ts";
import { convertResendTemplate } from "../templates/index.ts";
import type {
  Inventory,
  MigrationSource,
  Page,
  SourceContact,
  SourceProperty,
  SourceSuppression,
  SourceTopic,
} from "../types.ts";
import type { SourceDeps } from "./deps.ts";

const BASE_URL = "https://api.resend.com";
const PAGE = 100;
// Contacts whose properties or topics are read one by one: a page fits one runner step.
const DETAILED_PAGE = 20;

type ResendList<T> = { data: T[]; has_more?: boolean };

type ResendDomain = { id: string; name: string; status: string };
type ResendTemplateSummary = { id: string; name: string; alias?: string | null };
type ResendTemplate = ResendTemplateSummary & {
  subject?: string | null;
  html?: string | null;
  text?: string | null;
  from?: string | null;
  reply_to?: string | string[] | null;
  variables?: { key: string; type: "string" | "number"; fallback_value?: string | number | null }[];
};
type ResendProperty = {
  id: string;
  key: string;
  type: "string" | "number";
  fallback_value?: string | number | null;
};
type ResendTopic = {
  id: string;
  name: string;
  description?: string | null;
  default_subscription?: "opt_in" | "opt_out";
  visibility?: "public" | "private";
};
type ResendSegment = { id: string; name: string };
type ResendContact = {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  unsubscribed?: boolean;
  properties?: Record<string, unknown>;
};
type ResendContactTopic = { id: string; subscription?: "opt_in" | "opt_out" };
type ResendSuppression = { email: string; origin?: string; created_at?: string };
type ResendWebhook = { id: string; endpoint: string; events?: string[] };

/** A property value as Resend returns it: plain, or `{ value, type }`. */
function propertyValue(raw: unknown): string | number | null {
  const value =
    raw !== null && typeof raw === "object" && "value" in raw
      ? (raw as { value: unknown }).value
      : raw;
  return typeof value === "string" || typeof value === "number" ? value : null;
}

export function resendSource(apiKey: string, deps: SourceDeps = {}): MigrationSource {
  const client = providerClient({
    ...deps,
    name: "Resend",
    baseUrl: BASE_URL,
    // Requests without a User-Agent are refused.
    headers: { authorization: `Bearer ${apiKey}`, "user-agent": "coss.com-migrate/1.0" },
    invalidKey,
    minIntervalMs: 250,
    resetDelay: (headers) =>
      headers.get("ratelimit-remaining") === "0"
        ? Number(headers.get("ratelimit-reset") ?? "1") * 1000
        : null,
  });

  async function all<T extends { id: string }>(path: string, query: Record<string, string> = {}) {
    const items: T[] = [];
    let after: string | undefined;
    for (;;) {
      const page = await client.get<ResendList<T>>(path, { ...query, limit: PAGE, after });
      items.push(...page.data);
      const last = page.data.at(-1);
      if (!page.has_more || !last) return items;
      after = last.id;
    }
  }

  let propertiesCache: Promise<SourceProperty[]> | undefined;
  let topicsCache: Promise<SourceTopic[]> | undefined;

  const source: MigrationSource = {
    provider: "resend",

    async inventory(deadline) {
      const [domains, templates, properties, topics, lists, webhooks] = await Promise.all([
        source.domains(),
        source.templates(),
        source.properties(),
        source.topics(),
        source.lists(),
        all<ResendWebhook>("/webhooks"),
      ]);
      // No count endpoint: page through the contacts while there's time.
      let count = 0;
      let exact = false;
      let after: string | undefined;
      while ((deps.now ?? Date.now)() < deadline) {
        const page = await client.get<ResendList<ResendContact>>("/contacts", {
          limit: PAGE,
          after,
        });
        count += page.data.length;
        const last = page.data.at(-1);
        if (!page.has_more || !last) {
          exact = true;
          break;
        }
        after = last.id;
      }
      const suppressions = await suppressionPage(undefined).catch((error) => {
        if (betaUnavailable(error)) return null;
        throw error;
      });
      const inventory: Inventory = {
        account: null,
        domains,
        templates,
        properties,
        topics,
        lists,
        contacts: { count, exact },
        suppressions: suppressions
          ? { count: suppressions.data.length, exact: !suppressions.has_more }
          : null,
        webhooks: webhooks.map((hook) => ({
          id: hook.id,
          url: hook.endpoint,
          name: hook.endpoint,
        })),
        unavailable: {},
        notes: [
          "Unsubscribed contacts are imported as unsubscribed; bounces and complaints come from Resend's suppression list where your account has it.",
        ],
      };
      if (!suppressions) {
        inventory.notes.push(
          "Resend's suppression API isn't available for this account: export the list from Resend's dashboard and import the CSV on the Suppressions page.",
        );
      }
      return inventory;
    },

    async domains() {
      return (await all<ResendDomain>("/domains")).map((domain) => ({
        id: domain.id,
        name: domain.name,
        verified: domain.status === "verified",
      }));
    },

    properties() {
      propertiesCache ??= all<ResendProperty>("/contact-properties").then((rows) =>
        rows.map((row) => ({
          id: row.key,
          name: row.key,
          type: row.type === "number" ? "number" : "string",
          fallback: row.fallback_value ?? null,
        })),
      );
      return propertiesCache;
    },

    topics() {
      topicsCache ??= all<ResendTopic>("/topics").then((rows) =>
        rows.map((row) => ({
          id: row.id,
          name: row.name,
          description: row.description ?? null,
          defaultSubscription: row.default_subscription ?? "opt_in",
          visibility: row.visibility ?? "public",
        })),
      );
      return topicsCache;
    },

    async lists() {
      return (await all<ResendSegment>("/segments")).map((segment) => ({
        id: segment.id,
        name: segment.name,
        contactCount: null,
      }));
    },

    async templates() {
      return (await all<ResendTemplateSummary>("/templates")).map((template) => ({
        id: template.id,
        name: template.name,
        alias: template.alias ?? null,
      }));
    },

    async template(id) {
      const template = await client.get<ResendTemplate>(`/templates/${encodeURIComponent(id)}`);
      const notes: string[] = [];
      if (template.from)
        notes.push(`Resend's template sent from ${template.from}: pass from with each send.`);
      if (template.reply_to && template.reply_to.length > 0) {
        notes.push("Resend's template had a reply-to address: pass reply_to with each send.");
      }
      return {
        id: template.id,
        name: template.name,
        alias: template.alias ?? null,
        converted: convertResendTemplate({
          subject: template.subject ?? null,
          html: template.html ?? null,
          text: template.text ?? null,
          variables: template.variables ?? [],
        }),
        notes,
      };
    },

    async contacts(cursor) {
      const [properties, topics] = await Promise.all([source.properties(), source.topics()]);
      const detailed = properties.length > 0;
      const page = await client.get<ResendList<ResendContact>>("/contacts", {
        limit: detailed || topics.length > 0 ? DETAILED_PAGE : PAGE,
        after: cursor ?? undefined,
      });
      const items: SourceContact[] = [];
      for (const row of page.data) {
        let values: Record<string, unknown> = row.properties ?? {};
        if (detailed && !row.properties) {
          values =
            (await client.get<ResendContact>(`/contacts/${encodeURIComponent(row.id)}`))
              .properties ?? {};
        }
        const choices =
          topics.length > 0
            ? await all<ResendContactTopic>(`/contacts/${encodeURIComponent(row.id)}/topics`)
            : [];
        items.push({
          email: row.email,
          firstName: row.first_name ?? null,
          lastName: row.last_name ?? null,
          unsubscribed: row.unsubscribed === true,
          properties: Object.fromEntries(
            properties.map((property) => [property.id, propertyValue(values[property.id])]),
          ),
          topics: choices.flatMap((choice) =>
            choice.subscription
              ? [
                  {
                    topicId: choice.id,
                    status: choice.subscription === "opt_out" ? "opted_out" : "opted_in",
                  } as const,
                ]
              : [],
          ),
        });
      }
      const last = page.data.at(-1);
      return { items, next: page.has_more && last ? last.id : null };
    },

    async members(listId, cursor) {
      const page = await client.get<ResendList<ResendContact>>("/contacts", {
        segment_id: listId,
        limit: PAGE,
        after: cursor ?? undefined,
      });
      const last = page.data.at(-1);
      return {
        items: page.data.map((row) => row.email),
        next: page.has_more && last ? last.id : null,
      };
    },

    async suppressions(cursor) {
      let page: ResendList<ResendSuppression & { id?: string }>;
      try {
        page = await suppressionPage(cursor ?? undefined);
      } catch (error) {
        if (betaUnavailable(error)) return { items: [], next: null };
        throw error;
      }
      const items: SourceSuppression[] = page.data.map((row) => ({
        address: row.email,
        scope: { kind: "all" },
        reason:
          row.origin === "bounce" ? "bounce" : row.origin === "complaint" ? "complaint" : "manual",
        createdAt: row.created_at ? new Date(row.created_at) : null,
      }));
      const last = page.data.at(-1);
      return {
        items,
        next: page.has_more && last ? (last.id ?? last.email) : null,
      } satisfies Page<SourceSuppression>;
    },

    async webhooks() {
      return (await all<ResendWebhook>("/webhooks")).map((hook) => {
        const mapped = mapResendEvents(hook.events ?? []);
        return {
          id: hook.id,
          url: hook.endpoint,
          name: hook.endpoint,
          eventTypes: mapped.eventTypes,
          unmapped: mapped.unmapped,
          notes: mapped.notes,
        };
      });
    },
  };

  function suppressionPage(after: string | undefined) {
    return client.get<ResendList<ResendSuppression & { id?: string }>>("/suppressions", {
      limit: PAGE,
      after,
    });
  }

  return source;
}

/** Resend answers an unknown or deleted key with a 400. */
function invalidKey(status: number, message: string): boolean {
  return status === 400 && /api key is invalid/i.test(message);
}

function betaUnavailable(error: unknown): boolean {
  return (
    error instanceof ProviderError && (error.code === "forbidden" || error.code === "not_found")
  );
}

/**
 * Checks a key with one cheap request. Sending-only keys can't read anything an import needs.
 */
export async function checkResendKey(apiKey: string, deps: SourceDeps = {}): Promise<void> {
  try {
    await providerClient({
      ...deps,
      name: "Resend",
      baseUrl: BASE_URL,
      headers: { authorization: `Bearer ${apiKey}`, "user-agent": "coss.com-migrate/1.0" },
      invalidKey,
      minIntervalMs: 0,
      retries: 1,
    }).get("/domains", { limit: 1 });
  } catch (error) {
    if (
      error instanceof ProviderError &&
      (error.code === "unauthorized" || error.code === "forbidden")
    ) {
      throw new ProviderError(
        error.code,
        /restricted/i.test(error.message)
          ? "This Resend key can only send emails. Create a key with full access."
          : "Resend didn't accept this API key.",
        error.status,
      );
    }
    throw error;
  }
}
