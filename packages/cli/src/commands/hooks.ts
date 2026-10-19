/**
 * `coss hooks …`: the Hooks dev loop (webhooks as a service) on the public API: applications, event
 * types, endpoints, sending a message and following its deliveries, and the portal.
 */
import type { Coss, HookDelivery, HookDeliveryStatus, List } from "coss";
import { type Flags, list, requireArgs } from "../args.ts";
import { type Command, type CommandInput, defineCommand } from "../command.ts";
import { type Context, clientFor, resolveCredentials } from "../context.ts";
import { printable } from "../emails/format.ts";
import { apiError, CliError, UsageError } from "../errors.ts";
import { collect, field, jsonObject } from "../fields.ts";
import type { Output, Style } from "../output.ts";
import { table } from "../table.ts";

const DELIVERY_STATUSES: readonly HookDeliveryStatus[] = ["pending", "succeeded", "failed"];

const LIMIT = {
  type: "string",
  value: "<n>",
  description: "How many to show, 1-100 (default 50)",
} as const;

async function hooksClient(context: Context): Promise<Coss> {
  return clientFor(context.io, await resolveCredentials(context));
}

function limitOf(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const limit = Number(value);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new UsageError("--limit takes a number from 1 to 100.");
  }
  return limit;
}

/** `2026-10-15 12:00` */
function when(iso: string | null): string {
  return iso ? iso.slice(0, 16).replace("T", " ") : "";
}

/** One JSON object per item with --json, else a table under its headings (or `empty`). */
function printList<T>(
  out: Output,
  page: List<T>,
  options: { headings: string[]; row: (item: T) => string[]; empty: string; more?: string },
): void {
  if (out.json) {
    for (const item of page.data) out.data(item);
    return;
  }
  if (page.data.length === 0) {
    out.info(options.empty);
    return;
  }
  const lines = table([options.headings, ...page.data.map(options.row)]);
  out.line(out.style("dim", lines[0] ?? ""));
  for (const line of lines.slice(1)) out.line(line);
  if (page.has_more && options.more) out.info(out.style("dim", options.more));
}

/** `name=value` pairs of a repeatable flag, as an object. */
function pairs(values: string[] | undefined, flag: string): Record<string, string> | undefined {
  if (!values) return undefined;
  return Object.fromEntries(
    values.map((pair) => {
      const index = pair.indexOf("=");
      if (index <= 0) throw new UsageError(`--${flag} takes name=value, got "${pair}".`);
      return [pair.slice(0, index), pair.slice(index + 1)];
    }),
  );
}

function statusStyle(status: HookDeliveryStatus): Style {
  return status === "succeeded" ? "green" : status === "pending" ? "yellow" : "red";
}

// ── Applications ────────────────────────────────────────────────────────────────────────────────

const APPS_LIST_FLAGS = {
  limit: LIMIT,
  json: { type: "boolean", description: "One application per line, as JSON" },
} as const satisfies Flags;

const appsList: Command = defineCommand({
  name: "hooks apps list",
  summary: "List the environment's Hooks applications",
  description:
    "Lists the environment's applications (one per customer of yours, each with its own " +
    "endpoints and portal), newest first.",
  flags: APPS_LIST_FLAGS,
  run: async ({ values, context }: CommandInput<typeof APPS_LIST_FLAGS>) => {
    const coss = await hooksClient(context);
    const { data, error } = await coss.hooks.applications.list({ limit: limitOf(values.limit) });
    if (error) throw apiError("Couldn't list the applications", error);
    printList(context.out, data, {
      headings: ["ID", "UID", "NAME", "CREATED"],
      row: (app) => [app.id, app.uid ?? "", app.name, when(app.created_at)],
      empty: "No applications yet: `coss hooks apps create <name>` adds one.",
      more: "There are more: `coss api hooks/applications --paginate` lists them all.",
    });
    return 0;
  },
});

const APPS_CREATE_FLAGS = {
  uid: {
    type: "string",
    value: "<uid>",
    description:
      "Your own id for it, usable wherever the application's id is (e.g. your customer id)",
  },
  metadata: {
    type: "string",
    multiple: true,
    value: "<name=value>",
    description: "Metadata (repeatable)",
  },
  json: { type: "boolean", description: "Print the application as JSON" },
} as const satisfies Flags;

const appsCreate: Command = defineCommand({
  name: "hooks apps create",
  summary: "Create a Hooks application",
  usage: "<name> [options]",
  description:
    "Creates an application: one of your customers, whose users register endpoints for the " +
    "messages you send it. Its name is shown to them in the portal.",
  flags: APPS_CREATE_FLAGS,
  positionals: true,
  run: async ({ values, positionals, context }: CommandInput<typeof APPS_CREATE_FLAGS>) => {
    const [name] = requireArgs(positionals, 1, "hooks apps create <name> [--uid <uid>]") as [
      string,
    ];
    const metadata = pairs(values.metadata, "metadata");
    const coss = await hooksClient(context);
    const { data, error } = await coss.hooks.applications.create({
      name,
      ...(values.uid !== undefined && { uid: values.uid }),
      ...(metadata && { metadata }),
    });
    if (error) throw apiError("Couldn't create the application", error);
    const { out } = context;
    if (out.json) out.data(data);
    else {
      out.line(
        `${out.style("green", "✔")} Created ${data.name} ${out.style("dim", data.id)}${data.uid ? ` (uid ${data.uid})` : ""}`,
      );
    }
    return 0;
  },
});

// ── Event types ─────────────────────────────────────────────────────────────────────────────────

const TYPES_LIST_FLAGS = {
  archived: { type: "boolean", description: "Also list archived types" },
  limit: LIMIT,
  json: { type: "boolean", description: "One event type per line, as JSON" },
} as const satisfies Flags;

const eventTypesList: Command = defineCommand({
  name: "hooks event-types list",
  summary: "List the event types your applications' users subscribe to",
  description: "Lists the environment's event types: the catalog endpoints filter by.",
  flags: TYPES_LIST_FLAGS,
  run: async ({ values, context }: CommandInput<typeof TYPES_LIST_FLAGS>) => {
    const coss = await hooksClient(context);
    const { data, error } = await coss.hooks.eventTypes.list({
      limit: limitOf(values.limit),
      ...(values.archived && { include_archived: true }),
    });
    if (error) throw apiError("Couldn't list the event types", error);
    const { out } = context;
    printList(out, data, {
      headings: ["NAME", "DESCRIPTION", "EXAMPLES"],
      row: (type) => [
        type.archived ? `${type.name} ${out.style("dim", "(archived)")}` : type.name,
        type.description ?? "",
        String(type.examples.length),
      ],
      empty: "No event types yet: `coss hooks event-types create <name>` adds one.",
      more: "There are more: `coss api hooks/event_types --paginate` lists them all.",
    });
    return 0;
  },
});

const TYPES_CREATE_FLAGS = {
  description: { type: "string", value: "<text>", description: "Shown to your users" },
  schema: {
    type: "string",
    value: "<json>",
    description: "A JSON Schema of the payload, shown to your users (inline, @file or -)",
  },
  example: {
    type: "string",
    multiple: true,
    value: "<json>",
    description:
      "An example payload (repeatable, up to 5; inline, @file or -): the first is what " +
      "`coss hooks send` and test sends deliver without a payload",
  },
  json: { type: "boolean", description: "Print the event type as JSON" },
} as const satisfies Flags;

const eventTypesCreate: Command = defineCommand({
  name: "hooks event-types create",
  summary: "Create an event type",
  usage: "<name> [options]",
  description: "Creates an event type (e.g. invoice.paid) that messages are sent as.",
  flags: TYPES_CREATE_FLAGS,
  positionals: true,
  run: async ({ values, positionals, context }: CommandInput<typeof TYPES_CREATE_FLAGS>) => {
    const { io, out } = context;
    const [name] = requireArgs(positionals, 1, "hooks event-types create <name> [options]") as [
      string,
    ];
    const schema =
      values.schema === undefined ? undefined : await jsonObject(io, values.schema, "schema");
    const examples = await Promise.all(
      (values.example ?? []).map((example) => jsonObject(io, example, "example")),
    );
    const coss = await hooksClient(context);
    const { data, error } = await coss.hooks.eventTypes.create({
      name,
      ...(values.description !== undefined && { description: values.description }),
      ...(schema && { schema }),
      ...(examples.length > 0 && { examples }),
    });
    if (error) throw apiError("Couldn't create the event type", error);
    if (out.json) out.data(data);
    else out.line(`${out.style("green", "✔")} Created event type ${data.name}`);
    return 0;
  },
});

// ── Endpoints ───────────────────────────────────────────────────────────────────────────────────

const ENDPOINTS_LIST_FLAGS = {
  json: { type: "boolean", description: "One endpoint per line, as JSON" },
} as const satisfies Flags;

const endpointsList: Command = defineCommand({
  name: "hooks endpoints list",
  summary: "List an application's endpoints",
  usage: "<app> [options]",
  description: "Lists the endpoints of an application (its id or uid).",
  flags: ENDPOINTS_LIST_FLAGS,
  positionals: true,
  run: async ({ positionals, context }: CommandInput<typeof ENDPOINTS_LIST_FLAGS>) => {
    const [app] = requireArgs(positionals, 1, "hooks endpoints list <app>") as [string];
    const coss = await hooksClient(context);
    const { data, error } = await coss.hooks.endpoints.list(app);
    if (error) throw apiError("Couldn't list the endpoints", error);
    const { out } = context;
    printList(out, data, {
      headings: ["ID", "URL", "TYPES", "STATUS"],
      row: (endpoint) => [
        endpoint.id,
        endpoint.url,
        endpoint.filter_types.length > 0 ? endpoint.filter_types.join(",") : "all",
        !endpoint.enabled
          ? out.style("red", `disabled (${endpoint.disabled_reason ?? "manual"})`)
          : endpoint.failing_since
            ? out.style("yellow", `failing since ${when(endpoint.failing_since)}`)
            : out.style("green", "enabled"),
      ],
      empty: `No endpoints: \`coss hooks endpoints add ${app} --url <url>\` adds one.`,
    });
    return 0;
  },
});

const ENDPOINTS_ADD_FLAGS = {
  url: { type: "string", value: "<url>", description: "Where messages are posted (https://)" },
  types: {
    type: "string",
    multiple: true,
    value: "<types>",
    description: "Only these event types (repeatable, or comma-separated; default: all)",
  },
  description: { type: "string", value: "<text>", description: "Shown in the portal" },
  "rate-limit": {
    type: "string",
    value: "<n>",
    description: "At most this many requests a second (1-1000)",
  },
  json: { type: "boolean", description: "Print the endpoint, with its secret, as JSON" },
} as const satisfies Flags;

const endpointsAdd: Command = defineCommand({
  name: "hooks endpoints add",
  summary: "Add an endpoint to an application (prints its signing secret)",
  usage: "<app> --url <url> [options]",
  description:
    "Adds an endpoint to an application (its id or uid), as its users would in the portal, and " +
    "prints its signing secret: the only time it's shown here (`coss api " +
    "hooks/applications/<app>/endpoints/<id>/secret` reads it again).",
  flags: ENDPOINTS_ADD_FLAGS,
  positionals: true,
  run: async ({ values, positionals, context }: CommandInput<typeof ENDPOINTS_ADD_FLAGS>) => {
    const [app] = requireArgs(positionals, 1, "hooks endpoints add <app> --url <url>") as [string];
    if (!values.url) throw new UsageError("Pass --url, e.g. --url https://example.com/hooks.");
    let rateLimit: number | undefined;
    if (values["rate-limit"] !== undefined) {
      rateLimit = Number(values["rate-limit"]);
      if (!Number.isInteger(rateLimit) || rateLimit < 1 || rateLimit > 1000) {
        throw new UsageError("--rate-limit takes a number from 1 to 1000.");
      }
    }
    const types = list(values.types);
    const coss = await hooksClient(context);
    const { data, error } = await coss.hooks.endpoints.create(app, {
      url: values.url,
      ...(types.length > 0 && { filter_types: types }),
      ...(values.description !== undefined && { description: values.description }),
      ...(rateLimit !== undefined && { rate_limit_per_second: rateLimit }),
    });
    if (error) throw apiError("Couldn't add the endpoint", error);
    const { out } = context;
    if (out.json) {
      out.data(data);
      return 0;
    }
    out.line(`${out.style("green", "✔")} Added ${data.id} → ${data.url}`);
    out.line(`  Signing secret: ${out.style("bold", data.secret)}`);
    out.info(out.style("dim", "Save the secret now: the receiver verifies requests with it."));
    return 0;
  },
});

// ── Messages and deliveries ─────────────────────────────────────────────────────────────────────

const SEND_FLAGS = {
  data: {
    type: "string",
    value: "<json>",
    description:
      "The payload: a JSON object, inline, @file or - for stdin (default: the event type's first " +
      "example)",
  },
  field: {
    type: "string",
    short: "F",
    multiple: true,
    value: "<name=value>",
    description:
      "A payload field whose value is JSON when it parses, @path a file's contents (repeatable; " +
      "added to --data)",
  },
  "raw-field": {
    type: "string",
    short: "f",
    multiple: true,
    value: "<name=value>",
    description: "A payload field whose value is always a string (repeatable)",
  },
  "idempotency-key": {
    type: "string",
    value: "<key>",
    description: "Send it once only: the same key returns the first message",
  },
  json: { type: "boolean", description: "Print the message as JSON" },
} as const satisfies Flags;

const send: Command = defineCommand({
  name: "hooks send",
  summary: "Send a message to an application's endpoints",
  usage: "<app> <event-type> [options]",
  description:
    "Sends a message to an application (its id or uid): coss.com delivers it to every endpoint " +
    "subscribed to the event type, signed, with retries. Follow it with `coss hooks deliveries " +
    "<app> --message <id>`.",
  flags: SEND_FLAGS,
  positionals: true,
  run: async ({ values, positionals, context }: CommandInput<typeof SEND_FLAGS>) => {
    const { io, out } = context;
    const [app, eventType] = requireArgs(
      positionals,
      2,
      "hooks send <app> <event-type> [--data <json>] [-F name=value]",
    ) as [string, string];
    const fields = [
      ...(await Promise.all(
        (values["raw-field"] ?? []).map((pair) => field(pair, false, "raw-field")),
      )),
      ...(await Promise.all((values.field ?? []).map((pair) => field(pair, true, "field")))),
    ];
    const coss = await hooksClient(context);
    let payload: Record<string, unknown>;
    if (values.data !== undefined || fields.length > 0) {
      payload = {
        ...(values.data === undefined ? {} : await jsonObject(io, values.data, "data")),
        ...collect(fields, "body"),
      };
    } else {
      // Nothing given: the type's own example, as a test send would deliver.
      const { data: type, error } = await coss.hooks.eventTypes.get(eventType);
      if (error) throw apiError(`Couldn't read the event type ${eventType}`, error);
      const example = type.examples[0];
      if (!example) {
        throw new UsageError(
          `${eventType} has no example to send: pass the payload with --data or -F name=value.`,
        );
      }
      payload = example;
    }
    const { data, error } = await coss.hooks.messages.send(
      { application: app, event_type: eventType, payload },
      {
        ...(values["idempotency-key"] !== undefined && {
          idempotencyKey: values["idempotency-key"],
        }),
      },
    );
    if (error) throw apiError("Couldn't send the message", error);
    if (out.json) out.data(data);
    else {
      out.line(`${out.style("green", "✔")} Sent ${data.id} (${data.event_type}) to ${app}`);
      out.info(out.style("dim", `Follow it: coss hooks deliveries ${app} --message ${data.id}`));
    }
    return 0;
  },
});

const DELIVERIES_FLAGS = {
  endpoint: { type: "string", value: "<id>", description: "Only this endpoint's deliveries" },
  message: { type: "string", value: "<id>", description: "Only this message's deliveries" },
  status: {
    type: "string",
    value: "<status>",
    choices: DELIVERY_STATUSES,
    description: "pending, succeeded or failed",
  },
  limit: LIMIT,
  json: { type: "boolean", description: "One delivery per line, as JSON" },
} as const satisfies Flags;

async function deliveriesOf(
  coss: Coss,
  app: string,
  values: { endpoint?: string; message?: string; status?: HookDeliveryStatus; limit?: number },
): Promise<List<HookDelivery>> {
  if (values.message !== undefined) {
    const { data, error } = await coss.hooks.messages.listDeliveries(app, values.message);
    if (error) throw apiError("Couldn't list the message's deliveries", error);
    return { ...data, data: data.data.filter((d) => !values.status || d.status === values.status) };
  }
  const params = {
    ...(values.status && { status: values.status }),
    ...(values.limit !== undefined && { limit: values.limit }),
  };
  if (values.endpoint !== undefined) {
    const { data, error } = await coss.hooks.endpoints.listDeliveries(app, values.endpoint, params);
    if (error) throw apiError("Couldn't list the endpoint's deliveries", error);
    return data;
  }
  // Every endpoint's, newest first.
  const endpoints = await coss.hooks.endpoints.list(app);
  if (endpoints.error) throw apiError("Couldn't list the endpoints", endpoints.error);
  const pages = await Promise.all(
    endpoints.data.data.map(async (endpoint) => {
      const { data, error } = await coss.hooks.endpoints.listDeliveries(app, endpoint.id, params);
      if (error) throw apiError(`Couldn't list the deliveries of ${endpoint.id}`, error);
      return data;
    }),
  );
  const limit = values.limit ?? 50;
  const all = pages
    .flatMap((page) => page.data)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0));
  return {
    object: "list",
    data: all.slice(0, limit),
    has_more: all.length > limit || pages.some((page) => page.has_more),
  };
}

const deliveries: Command = defineCommand({
  name: "hooks deliveries",
  summary: "List an application's deliveries (by endpoint or message)",
  usage: "<app> [options]",
  description:
    "Lists deliveries of an application's messages, newest first: every endpoint's, or one " +
    "endpoint's (--endpoint) or one message's (--message). `coss hooks attempts` shows each " +
    "HTTP request of one.",
  flags: DELIVERIES_FLAGS,
  positionals: true,
  run: async ({ values, positionals, context }: CommandInput<typeof DELIVERIES_FLAGS>) => {
    const [app] = requireArgs(positionals, 1, "hooks deliveries <app> [options]") as [string];
    if (values.endpoint !== undefined && values.message !== undefined) {
      throw new UsageError("Pass --endpoint or --message, not both.");
    }
    if (
      values.status !== undefined &&
      !DELIVERY_STATUSES.includes(values.status as HookDeliveryStatus)
    ) {
      throw new UsageError(
        `--status takes ${DELIVERY_STATUSES.join(", ")}; got "${values.status}".`,
      );
    }
    const coss = await hooksClient(context);
    const page = await deliveriesOf(coss, app, {
      endpoint: values.endpoint,
      message: values.message,
      status: values.status as HookDeliveryStatus | undefined,
      limit: limitOf(values.limit),
    });
    const { out } = context;
    printList(out, page, {
      headings: ["ID", "STATUS", "ATTEMPTS", "LAST", "ENDPOINT", "MESSAGE", "CREATED"],
      row: (delivery) => [
        delivery.id,
        out.style(statusStyle(delivery.status), delivery.status),
        String(delivery.attempt_count),
        delivery.last_error ??
          (delivery.last_status_code === null ? "" : String(delivery.last_status_code)),
        delivery.endpoint_id,
        delivery.message_id,
        when(delivery.created_at),
      ],
      empty: "No deliveries.",
      more: "There are more: narrow with --endpoint, --message or --status, or raise --limit.",
    });
    return 0;
  },
});

const ATTEMPTS_FLAGS = {
  json: { type: "boolean", description: "One attempt per line, as JSON" },
} as const satisfies Flags;

const attempts: Command = defineCommand({
  name: "hooks attempts",
  summary: "Show every HTTP request of a delivery",
  usage: "<app> <delivery>",
  description:
    "Shows a delivery and each of its HTTP requests, oldest first: the status code (or the " +
    "error), how long it took and the start of the response.",
  flags: ATTEMPTS_FLAGS,
  positionals: true,
  run: async ({ positionals, context }: CommandInput<typeof ATTEMPTS_FLAGS>) => {
    const [app, id] = requireArgs(positionals, 2, "hooks attempts <app> <delivery>") as [
      string,
      string,
    ];
    const coss = await hooksClient(context);
    const [delivery, list] = await Promise.all([
      coss.hooks.deliveries.get(app, id),
      coss.hooks.deliveries.listAttempts(app, id),
    ]);
    if (delivery.error) throw apiError("Couldn't read the delivery", delivery.error);
    if (list.error) throw apiError("Couldn't list the delivery's attempts", list.error);
    const { out } = context;
    if (!out.json) {
      const next = delivery.data.next_attempt_at
        ? `, next attempt ${when(delivery.data.next_attempt_at)}`
        : "";
      out.line(
        `${delivery.data.id} ${out.style(statusStyle(delivery.data.status), delivery.data.status)} → ${delivery.data.endpoint_id}${out.style("dim", `${next}`)}`,
      );
    }
    printList(out, list.data, {
      headings: ["TIME", "STATUS", "DURATION", "RESPONSE"],
      row: (attempt) => [
        when(attempt.attempted_at),
        attempt.status_code === null
          ? out.style("red", printable(attempt.error ?? "no response"))
          : out.style(attempt.status_code < 300 ? "green" : "red", String(attempt.status_code)),
        `${attempt.duration_ms}ms`,
        // The receiver's text: no escape sequences reach the terminal.
        printable(attempt.response_excerpt ?? "")
          .replace(/\s+/g, " ")
          .slice(0, 80),
      ],
      empty: "No attempts yet.",
    });
    return 0;
  },
});

const RETRY_FLAGS = {
  json: { type: "boolean", description: "Print the delivery as JSON" },
} as const satisfies Flags;

const retry: Command = defineCommand({
  name: "hooks retry",
  summary: "Attempt a finished delivery once more",
  usage: "<app> <delivery>",
  description: "Queues a finished (succeeded or failed) delivery for one more attempt.",
  flags: RETRY_FLAGS,
  positionals: true,
  run: async ({ positionals, context }: CommandInput<typeof RETRY_FLAGS>) => {
    const [app, id] = requireArgs(positionals, 2, "hooks retry <app> <delivery>") as [
      string,
      string,
    ];
    const coss = await hooksClient(context);
    const { data, error } = await coss.hooks.deliveries.retry(app, id);
    if (error) throw apiError("Couldn't retry the delivery", error);
    const { out } = context;
    if (out.json) out.data(data);
    else out.line(`${out.style("green", "✔")} Queued ${data.id} for another attempt`);
    return 0;
  },
});

// ── Portal ──────────────────────────────────────────────────────────────────────────────────────

const PORTAL_FLAGS = {
  "read-only": { type: "boolean", description: "The user can look but not change anything" },
  "expires-in": {
    type: "string",
    value: "<seconds>",
    description: "How long the link works, 60-86400 (default 3600)",
  },
  open: { type: "boolean", description: "Open it in your browser" },
  json: { type: "boolean", description: "Print the session as JSON" },
} as const satisfies Flags;

const portal: Command = defineCommand({
  name: "hooks portal",
  summary: "Open an application's portal, as its user would see it",
  usage: "<app> [options]",
  description:
    "Creates a portal session for an application (its id or uid) and prints its link: the page " +
    "where its users manage their endpoints and see deliveries. Anyone with the link is signed " +
    "in until it expires, so don't share it.",
  flags: PORTAL_FLAGS,
  positionals: true,
  run: async ({ values, positionals, context }: CommandInput<typeof PORTAL_FLAGS>) => {
    const { io, out } = context;
    const [app] = requireArgs(positionals, 1, "hooks portal <app> [--open]") as [string];
    let expiresIn: number | undefined;
    if (values["expires-in"] !== undefined) {
      expiresIn = Number(values["expires-in"]);
      if (!Number.isInteger(expiresIn) || expiresIn < 60 || expiresIn > 86_400) {
        throw new UsageError("--expires-in takes seconds, from 60 to 86400.");
      }
    }
    const coss = await hooksClient(context);
    const { data, error } = await coss.hooks.portal.createSession({
      application: app,
      ...(values["read-only"] && { read_only: true }),
      ...(expiresIn !== undefined && { expires_in: expiresIn }),
    });
    if (error) throw apiError("Couldn't create the portal session", error);
    if (out.json) out.data(data);
    else {
      out.line(data.url);
      out.info(
        out.style(
          "dim",
          `Works until ${when(data.expires_at)} UTC${data.read_only ? ", read-only" : ""}.`,
        ),
      );
    }
    if (values.open && !(await io.openBrowser(data.url))) {
      throw new CliError("Couldn't open a browser: open the link above yourself.");
    }
    return 0;
  },
});

/** In the order `coss --help` lists them. */
export const HOOKS_COMMANDS: readonly Command[] = [
  appsList,
  appsCreate,
  eventTypesList,
  eventTypesCreate,
  endpointsList,
  endpointsAdd,
  send,
  deliveries,
  attempts,
  retry,
  portal,
];
