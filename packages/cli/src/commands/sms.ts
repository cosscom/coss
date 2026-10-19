import type { Coss, ReceivedSms, SendSmsParams, Sms, SmsEvent, SmsStatus } from "coss";
import { type Flags, pairs } from "../args.ts";
import { type Command, type CommandInput, defineCommand } from "../command.ts";
import { type Context, clientFor, resolveCredentials } from "../context.ts";
import { apiError, UsageError } from "../errors.ts";
import type { Output } from "../output.ts";
import {
  isSimulatedSmsOutcome,
  SIMULATED_SMS_OUTCOMES,
  type SimulatedSmsOutcome,
} from "../sms/simulate.ts";

const SANDBOX_FROM = "+14155550100";
const DEFAULT_BODY = "Test message from the coss.com CLI";

/** Statuses after which nothing more is expected. */
const SETTLED: ReadonlySet<SmsStatus> = new Set(["delivered", "undelivered", "failed", "canceled"]);

function settled(sms: Sms): boolean {
  return SETTLED.has(sms.status);
}

async function waitForOutcome(
  context: Context,
  coss: Coss,
  sms: Sms,
  options: { timeoutMs: number; reply: boolean },
): Promise<{ sms: Sms; events: SmsEvent[]; replies: ReceivedSms[] | undefined; settled: boolean }> {
  const { io, out } = context;
  const deadline = io.now().getTime() + options.timeoutMs;
  let current = sms;
  if (!out.json) out.info("Waiting for the outcome…");
  while (!settled(current) && io.now().getTime() < deadline && !io.signal.aborted) {
    await io.sleep(1000, io.signal);
    const { data, error } = await coss.sms.get(current.id, { signal: io.signal });
    if (error) {
      if (io.signal.aborted) break;
      throw apiError("Couldn't read the message", error);
    }
    current = data;
  }
  const { data, error } = await coss.sms.listEvents(current.id);
  if (error) throw apiError("Couldn't read the message's events", error);
  let replies: ReceivedSms[] | undefined;
  if (options.reply && current.status === "delivered") {
    // The simulator replies as the message is handed over: it is there once the message is.
    const received = await coss.sms.received.list({
      from: current.to,
      to: current.from,
      created_after: current.created_at,
    });
    if (received.error) throw apiError("Couldn't read the received messages", received.error);
    replies = received.data.data;
  }
  return { sms: current, events: data.data, replies, settled: settled(current) };
}

function statusStyle(status: string): Parameters<Output["style"]>[0] {
  if (status === "delivered" || status === "sent") return "green";
  if (status === "queued" || status === "scheduled") return "yellow";
  return "red";
}

const FLAGS = {
  to: { type: "string", value: "<number>", description: "Recipient, in E.164 form (+14155550123)" },
  simulate: {
    type: "string",
    value: "<outcome>",
    choices: Object.keys(SIMULATED_SMS_OUTCOMES),
    description:
      "Send to the SMS simulator (sandbox keys only): delivered, invalid, filtered, opted-out, reply",
  },
  from: {
    type: "string",
    value: "<number>",
    description:
      "Sender, in E.164 form (default for sandbox keys: +14155550100; live keys need one of your " +
      "organization's registered numbers)",
  },
  body: {
    type: "string",
    value: "<text>",
    description: 'Default: "Test message from the coss.com CLI"',
  },
  tag: { type: "string", multiple: true, value: "<name=value>", description: "A tag (repeatable)" },
  wait: {
    type: "boolean",
    description:
      "Follow the message until its outcome is known, then show its events (with --simulate " +
      "reply, also the reply)",
  },
  timeout: {
    type: "string",
    value: "<seconds>",
    description: "How long --wait waits (default 60)",
  },
  json: {
    type: "boolean",
    description: "Print the message (and with --wait, its events) as JSON",
  },
} as const satisfies Flags;

export const smsSendCommand: Command = defineCommand({
  name: "sms send",
  summary: "Send a test text message (--simulate filtered, --wait…)",
  description:
    "Sends a test text message from the API key's environment. Sandbox keys (coss_test_…) never " +
    "reach a phone: they go through coss.com's simulated provider, with every event and webhook a " +
    "real send has.",
  flags: FLAGS,
  run: smsSend,
});

async function smsSend({ values, context }: CommandInput<typeof FLAGS>): Promise<number> {
  const { io, out } = context;
  const simulate = values.simulate;
  if (simulate !== undefined && !isSimulatedSmsOutcome(simulate)) {
    throw new UsageError(
      `--simulate takes ${Object.keys(SIMULATED_SMS_OUTCOMES).join(", ")}; got "${simulate}".`,
    );
  }
  if (simulate && values.to) throw new UsageError("Pass --to or --simulate, not both.");
  const to = simulate ? SIMULATED_SMS_OUTCOMES[simulate as SimulatedSmsOutcome] : values.to;
  if (!to) throw new UsageError("Pass --to <number> or --simulate <outcome>.");
  const timeoutS = values.timeout === undefined ? 60 : Number(values.timeout);
  if (!Number.isFinite(timeoutS) || timeoutS <= 0) {
    throw new UsageError("--timeout takes a number of seconds.");
  }
  const tags = pairs(values.tag ?? [], "tag").map(([name, value]) => ({ name, value }));

  const credentials = await resolveCredentials(context);
  const live = credentials.apiKey.startsWith("coss_live_");
  if (live && simulate) {
    throw new UsageError(
      "--simulate needs a sandbox (coss_test_) key: live messages go to real carriers. Pass --to.",
    );
  }
  if (live && !values.from) {
    throw new UsageError(
      "Live keys send from one of your organization's numbers: pass --from +1….",
    );
  }
  const params: SendSmsParams = {
    from: values.from ?? SANDBOX_FROM,
    to,
    body: values.body ?? DEFAULT_BODY,
    ...(tags.length > 0 && { tags }),
  };

  const coss = clientFor(io, credentials);
  const { data: sms, error } = await coss.sms.send(params, { signal: io.signal });
  if (error) throw apiError("Couldn't send the message", error);

  if (!values.wait) {
    if (out.json) out.data(sms);
    else {
      out.line(
        `${out.style("green", "✔")} ${sms.id} ${sms.status} → ${sms.to}${sms.sandbox ? out.style("dim", " (sandbox)") : ""}`,
      );
      out.info(
        out.style("dim", "Add --wait to follow it, or run `coss logs tail` to watch every event."),
      );
    }
    return 0;
  }

  const outcome = await waitForOutcome(context, coss, sms, {
    timeoutMs: timeoutS * 1000,
    reply: simulate === "reply",
  });
  if (out.json) {
    out.data({
      ...outcome.sms,
      events: outcome.events,
      ...(outcome.replies && { replies: outcome.replies }),
    });
  } else {
    out.line(
      `${outcome.sms.id} ${out.style(statusStyle(outcome.sms.status), outcome.sms.status)} → ${outcome.sms.to}`,
    );
    if (outcome.sms.failure) {
      out.line(`  ${outcome.sms.failure.code}: ${outcome.sms.failure.message}`);
    }
    if (outcome.events.length > 0) out.line();
    for (const event of outcome.events) {
      const failure = event.data.failure ? `  ${event.data.failure.code}` : "";
      out.line(`  ${out.style("dim", event.occurred_at)}  ${event.type}${failure}`);
    }
    for (const reply of outcome.replies ?? []) {
      out.line();
      out.line(`  ${out.style("dim", reply.created_at)}  reply from ${reply.from}: ${reply.body}`);
    }
  }
  if (!outcome.settled && !io.signal.aborted) {
    out.warn(
      "Not every outcome arrived in time. Sends need the worker running (locally: `bun run dev`).",
    );
    return 1;
  }
  return io.signal.aborted ? 130 : 0;
}
