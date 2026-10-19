/**
 * Postmark (https://postmarkapp.com/developer). An account token reads domains and every server
 * (each server's own API tokens included, read fresh on every run and never stored); a server
 * token reads only its server. One server is imported per migration. Postmark keeps no contacts:
 * templates, suppressions (per message stream) and webhooks are what there is.
 */

import { type ProviderClient, ProviderError, providerClient } from "../http.ts";
import { mapPostmarkEvents, POSTMARK_TRIGGERS } from "../mapping/events.ts";
import { convertPostmarkTemplate } from "../templates/index.ts";
import type {
  Inventory,
  MigrationSource,
  SourceOptions,
  SourceSuppression,
  SourceWebhook,
} from "../types.ts";
import type { SourceDeps } from "./deps.ts";
import { inventorySections } from "./sections.ts";

const BASE_URL = "https://api.postmarkapp.com";
const TEMPLATE_PAGE = 100;
const DOMAIN_PAGE = 500;

type PmServer = { ID: number; Name: string; ApiTokens?: string[]; InboundHookUrl?: string | null };
type PmDomain = {
  ID: number;
  Name: string;
  DKIMVerified?: boolean;
  ReturnPathDomainVerified?: boolean;
};
type PmTemplateSummary = {
  TemplateId: number;
  Name: string;
  Alias?: string | null;
  TemplateType?: "Standard" | "Layout";
};
type PmTemplate = PmTemplateSummary & {
  Subject?: string | null;
  HtmlBody?: string | null;
  TextBody?: string | null;
  LayoutTemplate?: string | null;
};
type PmStream = {
  ID: string;
  Name: string;
  MessageStreamType: "Transactional" | "Broadcasts" | "Inbound";
};
type PmSuppression = {
  EmailAddress: string;
  SuppressionReason: "HardBounce" | "SpamComplaint" | "ManualSuppression";
  Origin?: "Recipient" | "Customer" | "Admin";
  CreatedAt?: string;
};
type PmWebhook = {
  ID: number;
  Url: string;
  MessageStream?: string;
  HttpAuth?: { Username?: string; Password?: string } | null;
  HttpHeaders?: { Name: string; Value: string }[] | null;
  Triggers?: Record<string, { Enabled?: boolean } | undefined>;
};

function postmarkClient(header: string, token: string, deps: SourceDeps): ProviderClient {
  return providerClient({
    ...deps,
    name: "Postmark",
    baseUrl: BASE_URL,
    headers: { [header]: token },
    minIntervalMs: 200,
  });
}

/** Where a Postmark suppression applies, and why, in coss.com's terms. */
export function postmarkSuppression(
  row: PmSuppression,
  stream: PmStream,
): Pick<SourceSuppression, "scope" | "reason"> {
  if (row.SuppressionReason === "HardBounce") return { scope: { kind: "all" }, reason: "bounce" };
  if (row.SuppressionReason === "SpamComplaint") {
    return { scope: { kind: "all" }, reason: "complaint" };
  }
  if (stream.MessageStreamType === "Broadcasts") {
    return {
      scope: { kind: "marketing" },
      reason: row.Origin === "Recipient" ? "unsubscribe" : "manual",
    };
  }
  return { scope: { kind: "all" }, reason: row.Origin === "Recipient" ? "unsubscribe" : "manual" };
}

export function postmarkSource(
  apiKey: string,
  options: SourceOptions,
  deps: SourceDeps = {},
): MigrationSource {
  const account =
    options.tokenType === "account"
      ? postmarkClient("x-postmark-account-token", apiKey, deps)
      : null;
  let serverCache: Promise<{ client: ProviderClient; server: PmServer }> | undefined;

  function server() {
    serverCache ??= (async () => {
      if (!account) {
        const client = postmarkClient("x-postmark-server-token", apiKey, deps);
        return { client, server: await client.get<PmServer>("/server") };
      }
      if (options.serverId === undefined) throw new Error("No Postmark server was chosen.");
      const found = await account.get<PmServer>(`/servers/${options.serverId}`);
      const token = found.ApiTokens?.[0];
      if (!token) {
        throw new ProviderError(
          "forbidden",
          `Postmark gave no API token for the server ${found.Name}.`,
        );
      }
      return { client: postmarkClient("x-postmark-server-token", token, deps), server: found };
    })();
    return serverCache;
  }

  async function streams(): Promise<PmStream[]> {
    const { client } = await server();
    const body = await client.get<{ MessageStreams?: PmStream[] }>("/message-streams", {
      MessageStreamType: "All",
    });
    return (body.MessageStreams ?? []).filter((stream) => stream.MessageStreamType !== "Inbound");
  }

  const empty = { items: [], next: null };

  const source: MigrationSource = {
    provider: "postmark",

    async inventory() {
      const { client, server: found } = await server();
      const { unavailable, section } = inventorySections();
      const [domains, templates, webhooks, suppressions] = await Promise.all([
        section("domains", () => source.domains(), []),
        section("templates", () => source.templates(), []),
        section("webhooks", () => source.webhooks(), []),
        section(
          "suppressions",
          async () => {
            let count = 0;
            for (const stream of await streams()) {
              const dump = await client.get<{ Suppressions?: PmSuppression[] }>(
                `/message-streams/${encodeURIComponent(stream.ID)}/suppressions/dump`,
              );
              count += dump.Suppressions?.length ?? 0;
            }
            return { count, exact: true };
          },
          null,
        ),
      ]);
      const inventory: Inventory = {
        account: found.Name,
        domains,
        templates,
        properties: [],
        topics: [],
        lists: [],
        contacts: null,
        suppressions,
        webhooks: webhooks.map((hook) => ({ id: hook.id, url: hook.url, name: hook.name })),
        unavailable: {
          ...unavailable,
          contacts: "Postmark doesn't keep contacts.",
          ...(!account
            ? { domains: "A server token can't read domains: use an account token." }
            : unavailable.domains
              ? { domains: "Only the Postmark account's owner can read its domains." }
              : {}),
        },
        notes: [
          "Hard bounces and spam complaints suppress every email; unsubscribes from a broadcast stream suppress marketing email only.",
          "Layouts are merged into the templates that use them.",
        ],
      };
      return inventory;
    },

    async domains() {
      if (!account) return [];
      const domains: PmDomain[] = [];
      for (let offset = 0; ; offset += DOMAIN_PAGE) {
        const page = await account.get<{ Domains?: PmDomain[] }>("/domains", {
          count: DOMAIN_PAGE,
          offset,
        });
        domains.push(...(page.Domains ?? []));
        if ((page.Domains?.length ?? 0) < DOMAIN_PAGE) break;
      }
      return domains.map((domain) => ({
        id: String(domain.ID),
        name: domain.Name.toLowerCase(),
        verified: domain.DKIMVerified === true && domain.ReturnPathDomainVerified !== false,
      }));
    },

    properties: async () => [],
    topics: async () => [],
    lists: async () => [],
    contacts: async () => empty,
    members: async () => empty,

    async templates() {
      const { client } = await server();
      const templates: PmTemplateSummary[] = [];
      for (let offset = 0; ; offset += TEMPLATE_PAGE) {
        const page = await client.get<{ Templates?: PmTemplateSummary[] }>("/templates", {
          count: TEMPLATE_PAGE,
          offset,
          TemplateType: "Standard",
        });
        templates.push(...(page.Templates ?? []));
        if ((page.Templates?.length ?? 0) < TEMPLATE_PAGE) break;
      }
      return templates.map((template) => ({
        id: String(template.TemplateId),
        name: template.Name,
        alias: template.Alias ?? null,
      }));
    },

    async template(id) {
      const { client } = await server();
      const template = await client.get<PmTemplate>(`/templates/${encodeURIComponent(id)}`);
      const notes: string[] = [];
      let layout: { html: string | null; text: string | null } | null = null;
      if (template.LayoutTemplate) {
        const found = await client.get<PmTemplate>(
          `/templates/${encodeURIComponent(template.LayoutTemplate)}`,
        );
        layout = { html: found.HtmlBody ?? null, text: found.TextBody ?? null };
        notes.push(`The layout ${found.Name} was merged into it.`);
      }
      // Postmark infers the data a template expects; it tells sections from loops.
      let suggestedModel: unknown;
      let modelMissing = false;
      try {
        suggestedModel = (
          await client.post<{ SuggestedTemplateModel?: unknown }>("/templates/validate", {
            Subject: template.Subject ?? "",
            HtmlBody: template.HtmlBody ?? "",
            TextBody: template.TextBody ?? "",
            ...(template.LayoutTemplate ? { LayoutTemplate: template.LayoutTemplate } : {}),
            TemplateType: "Standard",
          })
        ).SuggestedTemplateModel;
      } catch (error) {
        // Throttled or down: the runner comes back for it.
        if (
          error instanceof ProviderError &&
          (error.code === "rate_limited" || error.code === "unavailable")
        ) {
          throw error;
        }
        modelMissing = true;
      }
      let converted = convertPostmarkTemplate({
        subject: template.Subject ?? null,
        html: template.HtmlBody ?? null,
        text: template.TextBody ?? null,
        layout,
        suggestedModel,
      });
      const sources = [
        template.Subject,
        template.HtmlBody,
        template.TextBody,
        layout?.html,
        layout?.text,
      ];
      if (modelMissing && sources.some((source) => source && /\{\{\s*[#^]/.test(source))) {
        // Without Postmark's model, a section's data (a list, an object or a value) is a guess.
        converted = {
          ...converted,
          lossless: false,
          warnings: [
            ...converted.warnings,
            {
              field: "html",
              line: 1,
              column: 1,
              message:
                "Postmark couldn't describe this template's data, so its sections were converted as conditions: check the loops.",
            },
          ],
        };
      }
      return {
        id: String(template.TemplateId),
        name: template.Name,
        alias: template.Alias ?? null,
        converted,
        notes,
      };
    },

    async suppressions(cursor) {
      const { client } = await server();
      const index = cursor ? Number(cursor) : 0;
      const stream = (await streams())[index];
      if (!stream) return { items: [], next: null };
      const dump = await client.get<{ Suppressions?: PmSuppression[] }>(
        `/message-streams/${encodeURIComponent(stream.ID)}/suppressions/dump`,
      );
      return {
        items: (dump.Suppressions ?? []).map((row) => ({
          address: row.EmailAddress,
          ...postmarkSuppression(row, stream),
          createdAt: row.CreatedAt ? new Date(row.CreatedAt) : null,
        })),
        next: String(index + 1),
      };
    },

    async webhooks() {
      const { client, server: found } = await server();
      const body = await client.get<{ Webhooks?: PmWebhook[] }>("/webhooks");
      const hooks: SourceWebhook[] = (body.Webhooks ?? []).map((hook) => {
        const enabled = POSTMARK_TRIGGERS.filter((trigger) => hook.Triggers?.[trigger]?.Enabled);
        const mapped = mapPostmarkEvents(enabled);
        const notes = [...mapped.notes];
        if (hook.HttpAuth?.Username || hook.HttpAuth?.Password) {
          notes.push(
            "Postmark sent basic auth credentials; coss.com signs deliveries instead (verify the signature).",
          );
        }
        if (hook.HttpHeaders?.length) {
          notes.push("Postmark sent custom headers; coss.com endpoints don't have any.");
        }
        if (hook.MessageStream) {
          notes.push(
            `It was for the ${hook.MessageStream} stream; coss.com endpoints get the whole environment's events.`,
          );
        }
        return {
          id: String(hook.ID),
          url: hook.Url,
          name: hook.MessageStream ? `${hook.Url} (${hook.MessageStream})` : hook.Url,
          eventTypes: mapped.eventTypes,
          unmapped: mapped.unmapped,
          notes,
        };
      });
      if (found.InboundHookUrl) {
        hooks.push({
          id: "inbound",
          url: found.InboundHookUrl,
          name: "Inbound webhook",
          eventTypes: ["email.received"],
          unmapped: [],
          notes: [
            "Postmark posted the whole message; email.received carries its metadata (fetch the content from the API). Set up receiving on coss.com for mail to reach it.",
          ],
        });
      }
      return hooks;
    },
  };
  return source;
}

export type PostmarkCheck =
  | { options: SourceOptions; account: string }
  | { servers: { id: number; name: string }[] };

/**
 * Checks a token: an account token (then `serverId` picks the server, or the servers are
 * returned to choose from, unless there's only one), else a server token.
 */
export async function checkPostmarkKey(
  apiKey: string,
  serverId: number | undefined,
  deps: SourceDeps = {},
): Promise<PostmarkCheck> {
  const client = postmarkClient("x-postmark-account-token", apiKey, deps);
  try {
    const body = await client.get<{ Servers?: PmServer[] }>("/servers", { count: 500, offset: 0 });
    const servers = body.Servers ?? [];
    const chosen =
      serverId !== undefined
        ? servers.find((server) => server.ID === serverId)
        : servers.length === 1
          ? servers[0]
          : undefined;
    if (chosen) {
      return {
        options: { tokenType: "account", serverId: chosen.ID, serverName: chosen.Name },
        account: chosen.Name,
      };
    }
    if (servers.length === 0) {
      throw new ProviderError("not_found", "This Postmark account has no servers.");
    }
    return { servers: servers.map((server) => ({ id: server.ID, name: server.Name })) };
  } catch (error) {
    if (!(error instanceof ProviderError && error.code === "unauthorized")) throw error;
  }
  try {
    const found = await postmarkClient("x-postmark-server-token", apiKey, deps).get<PmServer>(
      "/server",
    );
    return {
      options: { tokenType: "server", serverId: found.ID, serverName: found.Name },
      account: found.Name,
    };
  } catch (error) {
    if (error instanceof ProviderError && error.code === "unauthorized") {
      throw new ProviderError(
        "unauthorized",
        "Postmark didn't accept this token as an account or a server token.",
        401,
      );
    }
    throw error;
  }
}
