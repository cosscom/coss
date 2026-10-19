import { isLiveOnlyEventType, TEST_WEBHOOK_EVENT_TYPES, type WebhookEventType } from "coss";
import type { Flags } from "../args.ts";
import { type Command, type CommandInput, defineCommand } from "../command.ts";
import { clientFor, resolveCredentials } from "../context.ts";
import { apiError, UsageError } from "../errors.ts";
import { field } from "../fields.ts";

const FLAGS = {
  data: {
    type: "string",
    value: "<json>",
    description:
      "A JSON object merged over the sample's data (objects field by field), e.g. " +
      '\'{"recipient":"ada@example.com"}\'',
  },
  field: {
    type: "string",
    short: "F",
    multiple: true,
    value: "<name=value>",
    description:
      "One field of the data (repeatable; applied after --data): a dotted name reaches into " +
      "objects (bounce.sub_type=NoEmail), the value is JSON when it parses, @path a file's contents",
  },
  json: {
    type: "boolean",
    description: "Print the event that was sent, and to how many receivers",
  },
} as const satisfies Flags;

export const triggerCommand: Command = defineCommand({
  name: "trigger",
  summary: "Send a test webhook event (with coss listen: your handler, on localhost)",
  usage: "<event-type> [options]",
  description:
    "Sends a test event of a type to the environment's subscribed endpoints and open `coss listen` " +
    "listeners, exactly like a real one: same body, signature, retries and log lines. Sandbox " +
    "keys only, and every type but the live-only domain.*, account.* and billing.*. The ids in the " +
    "sample are made up: pass real ones with --data or -F if your handler looks them up.\n\n" +
    "To run the real email pipeline instead (the send, the provider, then its events), use " +
    "`coss emails send --simulate bounced`.",
  flags: FLAGS,
  positionals: true,
  positionalChoices: TEST_WEBHOOK_EVENT_TYPES,
  run: trigger,
});

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Sets `path` (`bounce.sub_type`) in `target`, making the objects on the way. */
function setPath(target: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split(".");
  let node = target;
  for (const key of keys.slice(0, -1)) {
    const next = node[key];
    if (!isObject(next)) node[key] = {};
    node = node[key] as Record<string, unknown>;
  }
  node[keys.at(-1) ?? path] = value;
}

async function trigger({
  values,
  positionals,
  context,
}: CommandInput<typeof FLAGS>): Promise<number> {
  const { io, out } = context;
  const [type, ...extra] = positionals;
  if (type === undefined) {
    throw new UsageError("Pass an event type, e.g. `coss trigger email.bounced`.");
  }
  if (extra.length > 0)
    throw new UsageError(`coss trigger takes one event type; got ${positionals.length}.`);
  if (isLiveOnlyEventType(type)) {
    throw new UsageError(
      `${type} events only reach live environments, so there are no test events of them.`,
    );
  }
  if (!(TEST_WEBHOOK_EVENT_TYPES as readonly string[]).includes(type)) {
    throw new UsageError(
      `Unknown event type "${type}". Run \`coss trigger --help\`, or complete it with Tab.`,
    );
  }

  let data: Record<string, unknown> | undefined;
  if (values.data !== undefined) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(values.data);
    } catch {
      throw new UsageError("--data takes a JSON object.");
    }
    if (!isObject(parsed)) throw new UsageError("--data takes a JSON object.");
    data = parsed;
  }
  for (const pair of values.field ?? []) {
    const { name, list, value } = await field(pair, true, "field");
    data ??= {};
    if (list) {
      throw new UsageError(`--field sets one value; for a list, pass it as JSON: ${name}='[…]'.`);
    }
    setPath(data, name, value);
  }

  const credentials = await resolveCredentials(context);
  const coss = clientFor(io, credentials);
  const { data: sent, error } = await coss.webhookEvents.test(
    { type: type as WebhookEventType, ...(data && { data }) },
    { signal: io.signal },
  );
  if (error) throw apiError(`Couldn't send a test ${type} event`, error);
  if (out.json) {
    out.data(sent);
    return 0;
  }
  const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? "" : "s"}`;
  out.line(
    `${out.style("green", "✔")} ${sent.event.type} ${out.style("dim", sent.event.id)} → ${plural(sent.endpoints, "endpoint")}, ${plural(sent.listeners, "listener")}`,
  );
  if (sent.endpoints === 0 && sent.listeners === 0) {
    out.warn(
      `Nothing is subscribed to ${type}, so the event went nowhere: run \`coss listen\` in ` +
        "another terminal, or add a webhook endpoint.",
    );
  }
  return 0;
}
