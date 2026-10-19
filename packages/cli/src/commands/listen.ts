import { hostname as osHostname } from "node:os";
import type {
  ApiVersion,
  Coss,
  WebhookEventType,
  WebhookListener,
  WebhookListenerAck,
  WebhookListenerDelivery,
} from "coss";
import { type Flags, list } from "../args.ts";
import { type Command, defineCommand } from "../command.ts";
import { readConfig, writeConfig } from "../config.ts";
import {
  type Context,
  type Credentials,
  clientFor,
  describeEnvironment,
  resolveCredentials,
} from "../context.ts";
import { apiError, CliError, isTransient, UsageError } from "../errors.ts";
import type { CliIo } from "../io.ts";
import {
  type ForwardResult,
  forwardEvent,
  normalizeTarget,
  parseHeader,
} from "../listen/forward.ts";
import { generateSecret, isSecret } from "../listen/sign.ts";
import type { Output } from "../output.ts";

/** A poll waits this long for events; the SDK's timeout leaves room for the answer. */
const WAIT_MS = 20_000;
const CLIENT_TIMEOUT_MS = 35_000;
const POLL_LIMIT = 10;
const LIVE_ONLY_PREFIXES = ["account.", "billing."];

type Forwarded = {
  delivery: WebhookListenerDelivery;
  result: ForwardResult | null;
};

function ackOf({ delivery, result }: Forwarded): WebhookListenerAck {
  return {
    delivery_id: delivery.id,
    ack_token: delivery.ack_token,
    status_code: result?.statusCode ?? null,
    duration_ms: result?.durationMs ?? 0,
    error: result?.error ?? null,
  };
}

function report(out: Output, forwarded: Forwarded, printJson: boolean): void {
  const { delivery, result } = forwarded;
  if (out.json) {
    out.data({
      event_id: delivery.event_id,
      event_type: delivery.event_type,
      attempt: delivery.attempt,
      status_code: result?.statusCode ?? null,
      duration_ms: result?.durationMs ?? null,
      error: result?.error ?? null,
      body: JSON.parse(delivery.body) as unknown,
    });
    return;
  }
  const time = out.style("dim", new Date(delivery.created_at).toISOString().slice(11, 19));
  const outcome =
    result === null
      ? ""
      : result.error
        ? ` ${out.style("red", `✖ ${result.error}`)}`
        : ` ${out.style(result.statusCode !== null && result.statusCode < 300 ? "green" : "red", `[${result.statusCode}]`)} ${out.style("dim", `${result.durationMs}ms`)}`;
  const retry = delivery.attempt > 1 ? out.style("yellow", " (again)") : "";
  out.line(
    `${time} ${out.style("cyan", delivery.event_type)} ${out.style("dim", delivery.event_id)}${outcome}${retry}`,
  );
  if (printJson) out.line(JSON.stringify(JSON.parse(delivery.body), null, 2));
}

/** The profile's signing secret, created (and saved) on first use. */
async function signingSecret(io: CliIo, credentials: Credentials): Promise<string> {
  const saved = credentials.profile?.listen_secret;
  if (isSecret(saved)) return saved;
  const secret = generateSecret();
  if (credentials.source === "profile") {
    const config = await readConfig(io);
    const profile = config.profiles[credentials.profileName];
    if (profile) {
      profile.listen_secret = secret;
      await writeConfig(io, config);
    }
  }
  return secret;
}

async function openListener(
  coss: Coss,
  params: { eventTypes: string[]; apiVersion: string; description: string },
): Promise<WebhookListener> {
  const { data, error } = await coss.webhookListeners.create({
    ...(params.eventTypes.length > 0 && { event_types: params.eventTypes as WebhookEventType[] }),
    // The organization's pin may be newer than this SDK knows; the API checks it.
    api_version: params.apiVersion as ApiVersion,
    description: params.description,
  });
  if (error) throw apiError("Couldn't start listening", error);
  return data;
}

async function run(context: Context, values: Record<string, unknown>): Promise<number> {
  const { io, out } = context;
  const target =
    typeof values["forward-to"] === "string" ? normalizeTarget(values["forward-to"]) : null;
  // Not split on commas: header values may contain them.
  const headers = ((values.header as string[] | undefined) ?? []).map(parseHeader);
  const eventTypes = list(values.events as string[] | undefined);

  const credentials = await resolveCredentials(context);
  const coss = clientFor(io, credentials, { timeout: CLIENT_TIMEOUT_MS, maxRetries: 0 });
  const { data: environment, error } = await coss.environment.get();
  if (error) throw apiError("Couldn't read the environment", error);
  if (environment.mode === "live" && values.live !== true) {
    throw new CliError(
      `${describeEnvironment(environment)} is a live environment: you would receive its real ` +
        "events. Pass --live to listen anyway, or sign in to a sandbox environment.",
    );
  }
  if (
    environment.mode === "sandbox" &&
    eventTypes.some((type) => LIVE_ONLY_PREFIXES.some((prefix) => type.startsWith(prefix)))
  ) {
    out.warn(
      "account.* and billing.* events only reach live environments: you won't see them here.",
    );
  }
  const secret = await signingSecret(io, credentials);
  const apiVersion =
    typeof values["api-version"] === "string"
      ? values["api-version"]
      : environment.organization.api_version;
  const description = `${io.hostname() || osHostname()} → ${target ?? "terminal"}`.slice(0, 256);
  const listenerParams = { eventTypes, apiVersion, description };
  let listener = await openListener(coss, listenerParams);

  out.info(
    `${out.style("green", "Ready!")} Listening to ${describeEnvironment(environment)}${target ? `, forwarding to ${target}` : ""}.`,
  );
  // On stderr, so even with --json: the receiver needs it, and with COSS_API_KEY it isn't saved.
  out.info(`Signing secret: ${out.style("bold", secret)} (API version ${listener.api_version})`);
  out.info(out.style("dim", "Press Ctrl-C to stop."));

  let pending: WebhookListenerAck[] = [];
  let failures = 0;
  try {
    while (!io.signal.aborted) {
      const { data, error } = await coss.webhookListeners.poll(
        listener.id,
        { acks: pending, wait_ms: WAIT_MS, limit: POLL_LIMIT },
        { signal: io.signal },
      );
      if (error) {
        if (io.signal.aborted) break;
        if (error.type === "not_found_error") {
          // Expired (the laptop slept for more than 10 minutes): events since then are gone.
          out.warn("The listener had expired; started a new one. Events in between were missed.");
          listener = await openListener(coss, listenerParams);
          pending = [];
          continue;
        }
        if (!isTransient(error)) throw apiError("Listening stopped", error);
        failures++;
        if (failures === 1) out.warn(`Lost the connection (${error.message}); retrying…`);
        await io.sleep(Math.min(1000 * 2 ** failures, 30_000), io.signal);
        continue;
      }
      if (failures > 0 && !out.json) out.info("Reconnected.");
      failures = 0;
      pending = [];
      for (const delivery of data.deliveries) {
        // The rest are dropped with the listener (Ctrl-C).
        if (io.signal.aborted) break;
        const result = target
          ? await forwardEvent(io, {
              url: target,
              secret,
              eventId: delivery.event_id,
              body: delivery.body,
              headers,
            })
          : null;
        const forwarded = { delivery, result };
        report(out, forwarded, values["print-json"] === true);
        pending.push(ackOf(forwarded));
      }
    }
  } finally {
    // Report what was forwarded, then close: nothing more is queued for this machine.
    const cleanup = clientFor(io, credentials, { timeout: 5_000, maxRetries: 0 });
    if (pending.length > 0) {
      await cleanup.webhookListeners.poll(listener.id, { acks: pending, wait_ms: 0, limit: 1 });
    }
    await cleanup.webhookListeners.delete(listener.id);
  }
  return 130;
}

const FLAGS = {
  "forward-to": {
    type: "string",
    short: "f",
    value: "<url>",
    description: "e.g. localhost:3000/webhooks",
  },
  events: {
    type: "string",
    multiple: true,
    short: "e",
    value: "<types>",
    description: "Only these event types, e.g. email.delivered,email.bounced",
  },
  header: {
    type: "string",
    multiple: true,
    short: "H",
    value: '<"Name: value">',
    description: "An extra header on forwarded requests (repeatable)",
  },
  "api-version": {
    type: "string",
    value: "<date>",
    description: "The API version events are rendered in (default: your organization's)",
  },
  "print-json": { type: "boolean", description: "Print each event's body" },
  live: {
    type: "boolean",
    description: "Allow a live (production) key: you'd receive real events",
  },
  json: { type: "boolean", description: "One JSON object per forwarded event" },
} as const satisfies Flags;

export const listenCommand: Command = defineCommand({
  name: "listen",
  summary: "Forward the environment's webhook events to a local URL",
  usage: "[--forward-to <url>] [options]",
  description:
    "Receives the environment's webhook events as they happen and forwards each one to a local " +
    "URL, signed like coss.com signs the requests it sends endpoints (verify them with the SDK's " +
    "verifyWebhook and the signing secret printed at start). Without --forward-to, events are " +
    "only printed.",
  flags: FLAGS,
  run: ({ values, context }) => {
    if (values["api-version"] !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(values["api-version"])) {
      throw new UsageError("--api-version takes a date, e.g. 2026-10-01.");
    }
    return run(context, values);
  },
});
