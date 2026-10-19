/**
 * SendGrid (https://www.twilio.com/docs/sendgrid/api-reference), v3 API with a bearer key; EU
 * regional subusers' keys only work on the EU host. Rate limits are per endpoint, reported in
 * `X-RateLimit-*` headers. Contacts (and list members) only come out through an asynchronous
 * export: the cursor holds the export and the file being read, and a page is one file.
 */
import { csvRecords } from "@coss/email";
import { publicDownloader, unpack } from "../download.ts";
import { type ProviderClient, ProviderError, providerClient } from "../http.ts";
import { mapSendGridEvents, SENDGRID_EVENT_FLAGS } from "../mapping/events.ts";
import { convertSendGridTemplate } from "../templates/index.ts";
import type {
  Inventory,
  MigrationKind,
  MigrationSource,
  Page,
  SourceContact,
  SourceOptions,
  SourceProperty,
  SourceSuppression,
  SourceTopic,
} from "../types.ts";
import type { SourceDeps } from "./deps.ts";

const BASE_URLS = { global: "https://api.sendgrid.com", eu: "https://api.eu.sendgrid.com" };
const LIST_PAGE = 500;
// Megabytes per export file: each file is one page (a step of the runner).
const EXPORT_FILE_MB = 20;
const EXPORT_POLL_MS = 10_000;
const MAX_EXPORT_RESTARTS = 3;

/** Suppression lists read in this order, then each unsubscribe group's members. */
const SUPPRESSION_LISTS = [
  { path: "bounces", reason: "bounce" },
  { path: "invalid_emails", reason: "bounce" },
  { path: "spam_reports", reason: "complaint" },
  { path: "unsubscribes", reason: "unsubscribe" },
] as const;

type SgDomain = { id: number; domain: string; subdomain?: string; valid?: boolean };
type SgVersion = {
  id: string;
  active: number;
  subject?: string | null;
  html_content?: string | null;
  plain_content?: string | null;
  generate_plain_content?: boolean;
  test_data?: string | null;
};
type SgTemplate = {
  id: string;
  name: string;
  generation?: "legacy" | "dynamic";
  versions?: SgVersion[];
};
type SgPaged<T> = { result: T[]; _metadata?: { next?: string } };
type SgField = { id: string; name: string; field_type: "Text" | "Number" | "Date" };
type SgList = { id: string; name: string; contact_count?: number };
type SgGroup = { id: number; name: string; description?: string | null };
type SgSuppression = { email: string; created?: number };
type SgExport = { id: string };
type SgExportStatus = {
  status: "pending" | "ready" | "failure";
  urls?: string[];
  message?: string;
};
type SgWebhook = {
  id?: string;
  url: string;
  enabled?: boolean;
  friendly_name?: string | null;
} & Record<string, unknown>;

type ExportCursor = { exportId?: string; file: number; restarts: number };

function sendgridClient(apiKey: string, region: "global" | "eu", deps: SourceDeps): ProviderClient {
  return providerClient({
    ...deps,
    name: "SendGrid",
    baseUrl: BASE_URLS[region],
    headers: { authorization: `Bearer ${apiKey}` },
    minIntervalMs: 100,
    resetDelay: (headers, now) => {
      if (headers.get("x-ratelimit-remaining") !== "0") return null;
      const reset = Number(headers.get("x-ratelimit-reset"));
      return Number.isFinite(reset) && reset > 0 ? Math.max(0, reset * 1000 - now) : 1000;
    },
  });
}

/** The page token in SendGrid's `_metadata.next` URL. */
function pageToken(next: string | undefined): string | null {
  if (!next) return null;
  try {
    return new URL(next).searchParams.get("page_token");
  } catch {
    return null;
  }
}

export function sendgridSource(
  apiKey: string,
  options: SourceOptions,
  deps: SourceDeps = {},
): MigrationSource {
  const client = sendgridClient(apiKey, options.region ?? "global", deps);
  const download = deps.download ?? publicDownloader();
  const now = deps.now ?? Date.now;

  let propertiesCache: Promise<SourceProperty[]> | undefined;
  let groupsCache: Promise<SgGroup[]> | undefined;
  // A key may read the suppression lists but not unsubscribe groups: then there are no groups.
  let groupsRefused = false;
  const groups = () => {
    groupsCache ??= client.get<SgGroup[]>("/v3/asm/groups").catch((error) => {
      if (!(error instanceof ProviderError && error.code === "forbidden")) throw error;
      groupsRefused = true;
      return [];
    });
    return groupsCache;
  };

  /** One file of an export (`listId`: only that list's contacts), as CSV records. */
  async function exportPage(
    cursor: string | null,
    listId: string | null,
  ): Promise<Page<{ header: Map<string, number>; rows: string[][] }>> {
    const state: ExportCursor = cursor ? JSON.parse(cursor) : { file: 0, restarts: 0 };
    if (!state.exportId) {
      const created = await client.post<SgExport>("/v3/marketing/contacts/exports", {
        file_type: "csv",
        max_file_size: EXPORT_FILE_MB,
        ...(listId ? { list_ids: [listId] } : {}),
        notifications: { email: false },
      });
      return {
        items: [],
        next: JSON.stringify({ ...state, exportId: created.id, file: 0 }),
        retryAt: new Date(now() + EXPORT_POLL_MS),
      };
    }
    const status = await client.get<SgExportStatus>(
      `/v3/marketing/contacts/exports/${encodeURIComponent(state.exportId)}`,
    );
    if (status.status === "pending") {
      return { items: [], next: JSON.stringify(state), retryAt: new Date(now() + EXPORT_POLL_MS) };
    }
    if (status.status === "failure") {
      throw new ProviderError(
        "unavailable",
        `SendGrid couldn't export your contacts${status.message ? `: ${status.message}` : "."}`,
      );
    }
    const urls = status.urls ?? [];
    const url = urls[state.file];
    if (!url) return { items: [], next: null };
    let bytes: Uint8Array;
    try {
      bytes = unpack(await download(url));
    } catch (error) {
      // Export files expire: ask for a new export (the import is idempotent, so starting over is safe).
      if (state.restarts >= MAX_EXPORT_RESTARTS) {
        throw new ProviderError("unavailable", "SendGrid's contact export couldn't be downloaded.");
      }
      console.warn("[migrate:sendgrid] export download failed, exporting again:", error);
      return { items: [], next: JSON.stringify({ file: 0, restarts: state.restarts + 1 }) };
    }
    const [head, ...rows] = csvRecords(new TextDecoder().decode(bytes)).map(
      (record) => record.fields,
    );
    const header = new Map((head ?? []).map((name, index) => [name.trim().toLowerCase(), index]));
    const next =
      state.file + 1 < urls.length ? JSON.stringify({ ...state, file: state.file + 1 }) : null;
    return { items: [{ header, rows }], next };
  }

  const source: MigrationSource = {
    provider: "sendgrid",

    async inventory() {
      const unavailable: Partial<Record<MigrationKind, string>> = {};
      async function section<T>(
        kind: MigrationKind,
        read: () => Promise<T>,
        fallback: T,
      ): Promise<T> {
        try {
          return await read();
        } catch (error) {
          if (error instanceof ProviderError && error.code === "forbidden") {
            unavailable[kind] = "This API key isn't allowed to read them.";
            return fallback;
          }
          throw error;
        }
      }
      const domains = await section("domains", () => source.domains(), []);
      const templates = await section("templates", () => source.templates(), []);
      const properties = await section("contacts", () => source.properties(), []);
      const lists = await section("contacts", () => source.lists(), []);
      const contacts = await section(
        "contacts",
        async () =>
          (await client.get<{ contact_count: number }>("/v3/marketing/contacts/count"))
            .contact_count,
        0,
      );
      const topics = await source.topics();
      const webhooks = await section("webhooks", () => source.webhooks(), []);
      const inventory: Inventory = {
        account: null,
        domains,
        templates,
        properties,
        topics,
        lists,
        contacts: { count: contacts, exact: true },
        suppressions: null,
        webhooks: webhooks.map((hook) => ({ id: hook.id, url: hook.url, name: hook.name })),
        unavailable,
        notes: [
          "Suppressions: bounces, invalid addresses, spam reports, global unsubscribes and unsubscribe group members. Blocks are temporary and aren't imported.",
          "Unsubscribe groups become topics; their members are opted out of the topic.",
          "Segments and Single Sends aren't imported.",
        ],
      };
      if (groupsRefused) {
        inventory.notes.push(
          "This API key can't read unsubscribe groups, so they and their members won't be imported.",
        );
      }
      return inventory;
    },

    async domains() {
      const domains: SgDomain[] = [];
      for (let offset = 0; ; offset += 100) {
        const page = await client.get<SgDomain[]>("/v3/whitelabel/domains", { limit: 100, offset });
        domains.push(...page);
        if (page.length < 100) break;
      }
      // An authenticated domain is the From domain itself; `subdomain` is SendGrid's own CNAME host.
      return [...new Map(domains.map((d) => [d.domain.toLowerCase(), d])).values()].map(
        (domain) => ({
          id: String(domain.id),
          name: domain.domain.toLowerCase(),
          verified: domain.valid === true,
        }),
      );
    },

    properties() {
      propertiesCache ??= client
        .get<{ custom_fields?: SgField[] }>("/v3/marketing/field_definitions")
        .then((body) =>
          (body.custom_fields ?? []).map((field) => ({
            id: field.name,
            name: field.name,
            type:
              field.field_type === "Number"
                ? "number"
                : field.field_type === "Date"
                  ? "date"
                  : "string",
            fallback: null,
          })),
        );
      return propertiesCache;
    },

    async topics(): Promise<SourceTopic[]> {
      return (await groups()).map((group) => ({
        id: String(group.id),
        name: group.name,
        description: group.description || null,
        // Everyone gets a group's email until they unsubscribe from it.
        defaultSubscription: "opt_in",
        visibility: "public",
      }));
    },

    async lists() {
      const lists: SgList[] = [];
      let token: string | null = null;
      do {
        const page: SgPaged<SgList> = await client.get("/v3/marketing/lists", {
          page_size: 1000,
          page_token: token ?? undefined,
        });
        lists.push(...page.result);
        token = pageToken(page._metadata?.next);
      } while (token);
      return lists.map((list) => ({
        id: list.id,
        name: list.name,
        contactCount: list.contact_count ?? null,
      }));
    },

    async templates() {
      const templates: SgTemplate[] = [];
      let token: string | null = null;
      do {
        const page: SgPaged<SgTemplate> = await client.get("/v3/templates", {
          generations: "legacy,dynamic",
          page_size: 200,
          page_token: token ?? undefined,
        });
        templates.push(...page.result);
        token = pageToken(page._metadata?.next);
      } while (token);
      return templates.map((template) => ({
        id: template.id,
        name: template.name,
        alias: template.id,
      }));
    },

    async template(id) {
      const template = await client.get<SgTemplate>(`/v3/templates/${encodeURIComponent(id)}`);
      const active =
        template.versions?.find((version) => version.active === 1) ?? template.versions?.[0];
      const notes: string[] = [];
      let version = active;
      if (active && active.html_content === undefined) {
        version = await client.get<SgVersion>(
          `/v3/templates/${encodeURIComponent(id)}/versions/${encodeURIComponent(active.id)}`,
        );
      }
      if ((template.versions?.length ?? 0) > 1) {
        notes.push("Only the active version was imported.");
      }
      let testData: unknown;
      try {
        testData = version?.test_data ? JSON.parse(version.test_data) : undefined;
      } catch {
        testData = undefined;
      }
      return {
        id: template.id,
        name: template.name,
        alias: template.id,
        converted: convertSendGridTemplate({
          generation: template.generation ?? "legacy",
          subject: version?.subject ?? null,
          html: version?.html_content ?? null,
          // Left out when SendGrid generated it: coss.com generates the text part at send too.
          text: version?.generate_plain_content ? null : (version?.plain_content ?? null),
          testData,
        }),
        notes,
      };
    },

    async contacts(cursor) {
      const properties = await source.properties();
      const page = await exportPage(cursor, null);
      const items: SourceContact[] = [];
      for (const { header, rows } of page.items) {
        const column = (name: string) => header.get(name.toLowerCase());
        const email = column("email");
        if (email === undefined) {
          throw new ProviderError("bad_request", "SendGrid's contact export has no email column.");
        }
        const first = column("first_name");
        const last = column("last_name");
        for (const row of rows) {
          const address = row[email]?.trim();
          if (!address) continue;
          items.push({
            email: address,
            firstName: (first !== undefined && row[first]) || null,
            lastName: (last !== undefined && row[last]) || null,
            unsubscribed: false,
            properties: Object.fromEntries(
              properties.map((property) => {
                const index = column(property.name);
                const raw = index === undefined ? "" : (row[index] ?? "").trim();
                if (!raw) return [property.id, null];
                return [property.id, property.type === "number" ? Number(raw) : raw];
              }),
            ),
            topics: [],
          });
        }
      }
      return { items, next: page.next, retryAt: page.retryAt };
    },

    async members(listId, cursor) {
      const page = await exportPage(cursor, listId);
      const items: string[] = [];
      for (const { header, rows } of page.items) {
        const email = header.get("email");
        if (email === undefined) continue;
        for (const row of rows) {
          const address = row[email]?.trim();
          if (address) items.push(address);
        }
      }
      return { items, next: page.next, retryAt: page.retryAt };
    },

    async suppressions(cursor) {
      const state: { step: number; offset: number } = cursor
        ? JSON.parse(cursor)
        : { step: 0, offset: 0 };
      const list = SUPPRESSION_LISTS[state.step];
      if (list) {
        const rows = await client.get<SgSuppression[]>(`/v3/suppression/${list.path}`, {
          limit: LIST_PAGE,
          offset: state.offset,
        });
        const items: SourceSuppression[] = rows.map((row) => ({
          address: row.email,
          scope: { kind: "all" },
          reason: list.reason,
          createdAt: row.created ? new Date(row.created * 1000) : null,
        }));
        const next =
          rows.length < LIST_PAGE
            ? { step: state.step + 1, offset: 0 }
            : { step: state.step, offset: state.offset + LIST_PAGE };
        return { items, next: JSON.stringify(next) };
      }
      const group = (await groups())[state.step - SUPPRESSION_LISTS.length];
      if (!group) return { items: [], next: null };
      const addresses = await client.get<string[]>(`/v3/asm/groups/${group.id}/suppressions`);
      return {
        items: addresses.map((address) => ({
          address,
          scope: { kind: "topic", topicId: String(group.id) },
          reason: "unsubscribe",
          createdAt: null,
        })),
        next: JSON.stringify({ step: state.step + 1, offset: 0 }),
      };
    },

    async webhooks() {
      const body = await client.get<{ webhooks?: SgWebhook[] }>(
        "/v3/user/webhooks/event/settings/all",
      );
      const hooks = (body.webhooks ?? []).map((hook, index) => {
        const enabled = SENDGRID_EVENT_FLAGS.filter((flag) => hook[flag] === true);
        const mapped = mapSendGridEvents(enabled);
        return {
          id: hook.id ?? `event-${index}`,
          url: hook.url,
          name: hook.friendly_name || hook.url,
          eventTypes: mapped.eventTypes,
          unmapped: mapped.unmapped,
          notes: [
            ...mapped.notes,
            ...(hook.enabled === false ? ["It was disabled in SendGrid."] : []),
          ],
        };
      });
      const parse = await client
        .get<{ result?: { url: string; hostname: string }[] }>("/v3/user/webhooks/parse/settings")
        .catch((error) => {
          if (error instanceof ProviderError && error.code === "forbidden") return { result: [] };
          throw error;
        });
      for (const setting of parse.result ?? []) {
        hooks.push({
          id: `parse-${setting.hostname}`,
          url: setting.url,
          name: `Inbound Parse (${setting.hostname})`,
          eventTypes: ["email.received"],
          unmapped: [],
          notes: [
            `Inbound Parse posted the whole message; email.received carries its metadata (fetch the content from the API). Mail for ${setting.hostname} reaches coss.com once you set up receiving for it.`,
          ],
        });
      }
      return hooks;
    },
  };
  return source;
}

/** Checks a key, trying the global host and then the EU one; returns the region that answered. */
export async function checkSendGridKey(
  apiKey: string,
  deps: SourceDeps = {},
): Promise<{ region: "global" | "eu" }> {
  for (const region of ["global", "eu"] as const) {
    try {
      await sendgridClient(apiKey, region, deps).get("/v3/scopes");
      return { region };
    } catch (error) {
      if (!(error instanceof ProviderError && error.code === "unauthorized")) throw error;
    }
  }
  throw new ProviderError("unauthorized", "SendGrid didn't accept this API key.", 401);
}
