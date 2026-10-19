import type { WebhookDelivery, WebhookDeliveryStatus, WebhookEndpoint } from "coss";
import type { Flags } from "../args.ts";
import { type Command, type CommandInput, defineCommand } from "../command.ts";
import { clientFor, resolveCredentials } from "../context.ts";
import { printable } from "../emails/format.ts";
import { apiError, UsageError } from "../errors.ts";
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
      out.info("No webhook endpoints. Run `coss listen` to receive events on this machine.");
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
