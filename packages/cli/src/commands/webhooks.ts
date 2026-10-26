import { relative } from "node:path";
import {
  WEBHOOK_EVENT_TYPES,
  type WebhookDelivery,
  type WebhookDeliveryStatus,
  type WebhookEndpoint,
  type WebhookEventType,
} from "coss";
import { type Flags, list, requireArgs } from "../args.ts";
import { type Command, type CommandInput, defineCommand } from "../command.ts";
import { clientFor, resolveCredentials } from "../context.ts";
import { printable } from "../emails/format.ts";
import { projectEnvFile, readEnvValue, writeEnvValue } from "../env-file.ts";
import { apiError, CliError, UsageError } from "../errors.ts";
import type { Output } from "../output.ts";

const DELIVERY_STATUSES: readonly WebhookDeliveryStatus[] = ["pending", "succeeded", "failed"];

function endpointState(out: Output, endpoint: WebhookEndpoint): string {
  if (!endpoint.enabled) {
    return out.style(
      "red",
      endpoint.disabled_reason === "failing" ? "disabled (failing)" : "disabled",
    );
  }
  return endpoint.failing_since
    ? out.style("yellow", `failing since ${endpoint.failing_since.slice(0, 16).replace("T", " ")}`)
    : out.style("green", "enabled");
}

export const webhooksListCommand: Command = defineCommand({
  name: "webhooks list",
  summary: "List the environment's webhook endpoints",
  description:
    "Lists the webhook endpoints of the API key's environment: id, URL, state and the event " +
    "types each receives.",
  flags: { json: { type: "boolean", description: "One endpoint object per line" } },
  run: async ({ context }) => {
    const { io, out } = context;
    const credentials = await resolveCredentials(context);
    const { data, error } = await clientFor(io, credentials).webhookEndpoints.list({
      signal: io.signal,
    });
    if (error) throw apiError("Couldn't list the webhook endpoints", error);
    if (out.json) {
      for (const endpoint of data.data) out.data(endpoint);
      return 0;
    }
    if (data.data.length === 0) {
      out.info(
        "No webhook endpoints. `coss webhooks add https://…` creates one, or `coss listen` receives events here.",
      );
      return 0;
    }
    for (const endpoint of data.data) {
      const types =
        endpoint.event_types.length === 0 ? "every event" : endpoint.event_types.join(", ");
      out.line(`${endpoint.id}  ${endpoint.url}  ${endpointState(out, endpoint)}`);
      out.line(
        `  ${out.style("dim", types)}${endpoint.description ? `  ${out.style("dim", `· ${endpoint.description}`)}` : ""}`,
      );
    }
    return 0;
  },
});

const DELIVERIES_FLAGS = {
  status: {
    type: "string",
    value: "<status>",
    choices: DELIVERY_STATUSES,
    description: "Only deliveries with this status: pending, succeeded, failed",
  },
  event: { type: "string", value: "<event-id>", description: "Only the delivery of this event" },
  limit: {
    type: "string",
    value: "<n>",
    description: "How many, newest first (1-100, default 20)",
  },
  json: { type: "boolean", description: "One delivery object per line, with its attempts" },
} as const satisfies Flags;

function statusStyle(status: WebhookDeliveryStatus): Parameters<Output["style"]>[0] {
  return status === "succeeded" ? "green" : status === "failed" ? "red" : "yellow";
}

function describeDelivery(out: Output, delivery: WebhookDelivery): string {
  const when = out.style("dim", delivery.created_at.slice(0, 19).replace("T", " "));
  const code = delivery.last_status_code === null ? "" : ` [${delivery.last_status_code}]`;
  const failure = delivery.last_error ? out.style("dim", ` ${printable(delivery.last_error)}`) : "";
  const attempts = `${delivery.attempt_count} attempt${delivery.attempt_count === 1 ? "" : "s"}`;
  return `${when}  ${delivery.id}  ${out.style("cyan", delivery.event_type)}  ${out.style(statusStyle(delivery.status), delivery.status)}${code}  ${out.style("dim", attempts)}${failure}`;
}

export const webhooksDeliveriesCommand: Command = defineCommand({
  name: "webhooks deliveries",
  summary: "List an endpoint's deliveries (--status failed)",
  usage: "<endpoint-id> [options]",
  description:
    "Lists the deliveries of one webhook endpoint, newest first: the event, its status, the last " +
    "HTTP status code and error. Retry one with `coss webhooks retry`.",
  flags: DELIVERIES_FLAGS,
  positionals: true,
  run: deliveries,
});

async function deliveries({
  values,
  positionals,
  context,
}: CommandInput<typeof DELIVERIES_FLAGS>): Promise<number> {
  const { io, out } = context;
  const [endpointId, ...extra] = positionals;
  if (endpointId === undefined || extra.length > 0) {
    throw new UsageError(
      "Pass one endpoint id, e.g. `coss webhooks deliveries whep_…` (see `coss webhooks list`).",
    );
  }
  const status = values.status;
  if (status !== undefined && !(DELIVERY_STATUSES as readonly string[]).includes(status)) {
    throw new UsageError(`--status takes ${DELIVERY_STATUSES.join(", ")}; got "${status}".`);
  }
  const limit = values.limit === undefined ? 20 : Number(values.limit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new UsageError("--limit takes a number from 1 to 100.");
  }
  const credentials = await resolveCredentials(context);
  const { data, error } = await clientFor(io, credentials).webhookEndpoints.deliveries.list(
    endpointId,
    {
      limit,
      ...(status && { status: status as WebhookDeliveryStatus }),
      ...(values.event && { event_id: values.event }),
    },
    { signal: io.signal },
  );
  if (error) throw apiError("Couldn't list the deliveries", error);
  if (out.json) {
    for (const delivery of data.data) out.data(delivery);
    return 0;
  }
  if (data.data.length === 0) {
    out.info(status ? `No ${status} deliveries.` : "No deliveries yet.");
    return 0;
  }
  for (const delivery of data.data) out.line(describeDelivery(out, delivery));
  if (data.has_more) {
    out.info(
      out.style(
        "dim",
        `More with --limit, or: coss api webhook_endpoints/${endpointId}/deliveries --paginate`,
      ),
    );
  }
  return 0;
}

export const webhooksRetryCommand: Command = defineCommand({
  name: "webhooks retry",
  summary: "Send a delivery to its endpoint once more",
  usage: "<endpoint-id> <delivery-id>",
  description:
    "Queues a finished delivery for one more attempt, made within seconds (a pending one is " +
    "already scheduled, and stays as it is). Find its id with `coss webhooks deliveries`.",
  flags: { json: { type: "boolean", description: "Print the delivery as JSON" } },
  positionals: true,
  run: async ({ positionals, context }) => {
    const { io, out } = context;
    const [endpointId, deliveryId, ...extra] = positionals;
    if (endpointId === undefined || deliveryId === undefined || extra.length > 0) {
      throw new UsageError(
        "Pass the endpoint id and the delivery id: `coss webhooks retry whep_… whdel_…`.",
      );
    }
    const credentials = await resolveCredentials(context);
    const { data, error } = await clientFor(io, credentials).webhookEndpoints.deliveries.retry(
      endpointId,
      deliveryId,
      { signal: io.signal },
    );
    if (error) throw apiError("Couldn't retry the delivery", error);
    if (out.json) out.data(data);
    else {
      out.line(
        `${out.style("green", "✔")} ${data.id} ${data.status}${data.next_attempt_at ? `, next attempt ${data.next_attempt_at}` : ""}`,
      );
      out.info(out.style("dim", "Run `coss logs tail --source webhook` to watch the attempt."));
    }
    return 0;
  },
});

const ADD_FLAGS = {
  description: {
    type: "string",
    value: "<text>",
    description: "A note stored on the endpoint",
  },
  events: {
    type: "string",
    multiple: true,
    value: "<types>",
    description: "Only these event types (default: every event, including later ones)",
  },
  force: {
    type: "boolean",
    description: "Create another endpoint when this URL already has one",
  },
  json: {
    type: "boolean",
    description: "Print the endpoint as JSON, including its signing secret",
  },
} as const satisfies Flags;

export const webhooksAddCommand: Command = defineCommand({
  name: "webhooks add",
  summary: "Create an endpoint and save its signing secret",
  usage: "<url> [options]",
  description:
    "Creates a webhook endpoint at <url>. The signing secret is returned once and written to " +
    "the project env file as COSS_WEBHOOK_SECRET, which verifyWebhook and `coss listen` both " +
    "use (a previous value is replaced, so local forwarding and this endpoint sign the same " +
    "way). Creation is not retried. If this URL already has an endpoint, it is left as it is " +
    "unless --force.",
  flags: ADD_FLAGS,
  positionals: true,
  run: addEndpoint,
});

async function addEndpoint({
  values,
  positionals,
  context,
}: CommandInput<typeof ADD_FLAGS>): Promise<number> {
  const { io, out } = context;
  const [url] = requireArgs(positionals, 1, "webhooks add <url>");
  if (url === undefined || !/^https?:\/\//i.test(url)) {
    throw new UsageError("Pass an http(s) URL: `coss webhooks add https://example.com/webhooks`.");
  }
  const events = list(values.events);
  const unknown = events.filter(
    (type) => !(WEBHOOK_EVENT_TYPES as readonly string[]).includes(type),
  );
  if (unknown.length > 0) {
    throw new UsageError(
      `Unknown event type ${unknown.map((type) => `"${type}"`).join(", ")}. ` +
        "See https://coss.com/docs/webhooks.",
    );
  }
  const credentials = await resolveCredentials(context);
  const coss = clientFor(io, credentials);
  const listed = await coss.webhookEndpoints.list({ signal: io.signal });
  if (listed.error) throw apiError("Couldn't list the webhook endpoints", listed.error);
  const existing = listed.data.data.filter((endpoint) => endpoint.url === url);
  if (existing.length > 0 && values.force !== true) {
    if (out.json) out.data({ created: false, endpoints: existing });
    else {
      const ids = existing.map((endpoint) => endpoint.id).join(", ");
      out.line(`${url} already has ${ids}.`);
      out.info(
        "Its signing secret was shown only when it was created. Pass --force to create another endpoint.",
      );
    }
    return 0;
  }
  const { data, error } = await coss.webhookEndpoints.create(
    {
      url,
      ...(values.description ? { description: values.description } : {}),
      ...(events.length > 0 ? { event_types: events as WebhookEventType[] } : {}),
    },
    { signal: io.signal },
  );
  if (error) throw apiError("Couldn't create the webhook endpoint", error);

  const file = await projectEnvFile(io.cwd);
  const previous = file.text ? readEnvValue(file.text, "COSS_WEBHOOK_SECRET") : "";
  let wrote = false;
  try {
    wrote = await writeEnvValue(file, "COSS_WEBHOOK_SECRET", data.secret);
  } catch (cause) {
    out.info(`COSS_WEBHOOK_SECRET=${data.secret}`);
    throw new CliError(
      `Created ${data.id}, but couldn't save its signing secret ` +
        `(${cause instanceof Error ? cause.message : "write failed"}). Store the secret above; ` +
        "the API will not show it again.",
    );
  }
  const shown = relative(io.cwd, file.path) || file.path;
  const replaced = previous !== "" && previous !== data.secret;
  if (out.json) {
    out.data({ ...data, created: true, env_file: shown, replaced_existing_secret: replaced });
    return 0;
  }
  out.line(`${out.style("green", "✔")} ${data.id}  ${data.url}`);
  out.info(`COSS_WEBHOOK_SECRET=${data.secret}`);
  const where = replaced
    ? `Saved COSS_WEBHOOK_SECRET in ${shown}, replacing the previous value.`
    : wrote
      ? `Saved COSS_WEBHOOK_SECRET in ${shown}.`
      : `COSS_WEBHOOK_SECRET in ${shown} already matches.`;
  out.info(`${where} coss listen signs with it too.`);
  return 0;
}
