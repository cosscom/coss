import { readFile } from "node:fs/promises";
import type { Coss, Email, EmailEvent, EmailRecipientStatus, SendEmailParams } from "coss";
import { addresses, parseFlags } from "../args.ts";
import { type Context, clientFor, createContext, resolveCredentials } from "../context.ts";
import {
  isSimulatedOutcome,
  SIMULATED_OUTCOMES,
  type SimulatedOutcome,
} from "../emails/simulate.ts";
import { apiError, CliError, UsageError } from "../errors.ts";
import type { CliIo } from "../io.ts";
import type { Output } from "../output.ts";

export const EMAILS_SEND_HELP = `Usage: coss emails send [options]

Sends a test email from the API key's environment. Sandbox keys (coss_test_…) never deliver: they
go through COSS's simulated provider, with every event and webhook a real send has.

Options:
  --to <address>         Recipient (repeatable, or comma-separated)
  --simulate <outcome>   Send to the mailbox simulator: delivered, bounced, complained, suppressed
  --from <address>       Sender (default for sandbox keys: COSS CLI <cli@example.com>; live keys
                         need an address on a verified domain)
  --cc, --bcc, --reply-to <address>
  --subject <text>       Default: "Test email from the COSS CLI"
  --text <text>, --text-file <path>
  --html <html>, --html-file <path>
  --template <id|alias>  Send a published template (instead of subject and body)
  --var <name=value>     A template variable (repeatable; values are JSON when they parse)
  --category <name>
  --tag <name=value>     Repeatable
  --wait                 Follow the email until every recipient's outcome is known, then show
                         its events
  --timeout <seconds>    How long --wait waits (default 60)
  --json                 Print the email (and with --wait, its events) as JSON
`;

const SANDBOX_FROM = "COSS CLI <cli@example.com>";
const DEFAULT_SUBJECT = "Test email from the COSS CLI";
const DEFAULT_TEXT = "Sent with `coss emails send`. https://coss.com/docs/cli";

/** Recipient statuses after which nothing more is expected (unless waiting for a complaint). */
const SETTLED: ReadonlySet<EmailRecipientStatus> = new Set([
  "delivered",
  "bounced",
  "suppressed",
  "complained",
  "failed",
  "canceled",
]);

function pairs(values: string[], flag: string): [string, string][] {
  return values.map((pair) => {
    const index = pair.indexOf("=");
    if (index <= 0) throw new UsageError(`--${flag} takes name=value, got "${pair}".`);
    return [pair.slice(0, index), pair.slice(index + 1)];
  });
}

function variableValue(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

async function fileOrValue(value: string | undefined, file: string | undefined, flag: string) {
  if (value !== undefined && file !== undefined) {
    throw new UsageError(`Pass --${flag} or --${flag}-file, not both.`);
  }
  if (file === undefined) return value;
  try {
    return await readFile(file, "utf8");
  } catch (error) {
    throw new CliError(`Couldn't read ${file}: ${(error as Error).message}`);
  }
}

function settled(email: Email, simulate: SimulatedOutcome | undefined): boolean {
  if (email.status === "failed" || email.status === "canceled") return true;
  if (email.status === "queued" || email.status === "scheduled") return false;
  return email.recipients.every((recipient) =>
    simulate === "complained" && recipient.address === SIMULATED_OUTCOMES.complained
      ? recipient.status === "complained"
      : SETTLED.has(recipient.status),
  );
}

async function waitForOutcome(
  context: Context,
  coss: Coss,
  email: Email,
  options: { timeoutMs: number; simulate: SimulatedOutcome | undefined },
): Promise<{ email: Email; events: EmailEvent[]; settled: boolean }> {
  const { io, out } = context;
  const deadline = io.now().getTime() + options.timeoutMs;
  let current = email;
  if (!out.json) out.info("Waiting for the outcome…");
  while (
    !settled(current, options.simulate) &&
    io.now().getTime() < deadline &&
    !io.signal.aborted
  ) {
    await io.sleep(1000, io.signal);
    const { data, error } = await coss.email.get(current.id, { signal: io.signal });
    if (error) {
      if (io.signal.aborted) break;
      throw apiError("Couldn't read the email", error);
    }
    current = data;
  }
  const { data, error } = await coss.email.listEvents(current.id);
  if (error) throw apiError("Couldn't read the email's events", error);
  return { email: current, events: data.data, settled: settled(current, options.simulate) };
}

function statusStyle(status: string): Parameters<Output["style"]>[0] {
  if (status === "delivered" || status === "sent") return "green";
  if (status === "queued" || status === "scheduled" || status === "delivery_delayed")
    return "yellow";
  return "red";
}

export async function emailsSend(argv: string[], io: CliIo): Promise<number> {
  const { values, global } = parseFlags(argv, {
    to: { type: "string", multiple: true },
    cc: { type: "string", multiple: true },
    bcc: { type: "string", multiple: true },
    "reply-to": { type: "string", multiple: true },
    from: { type: "string" },
    subject: { type: "string" },
    text: { type: "string" },
    "text-file": { type: "string" },
    html: { type: "string" },
    "html-file": { type: "string" },
    template: { type: "string" },
    var: { type: "string", multiple: true },
    category: { type: "string" },
    tag: { type: "string", multiple: true },
    simulate: { type: "string" },
    wait: { type: "boolean" },
    timeout: { type: "string" },
  });
  const context = createContext(io, global);
  const { out } = context;
  if (global.help) {
    out.line(EMAILS_SEND_HELP);
    return 0;
  }

  const simulate = values.simulate;
  if (simulate !== undefined && !isSimulatedOutcome(simulate)) {
    throw new UsageError(
      `--simulate takes ${Object.keys(SIMULATED_OUTCOMES).join(", ")}; got "${simulate}".`,
    );
  }
  const to = [...addresses(values.to), ...(simulate ? [SIMULATED_OUTCOMES[simulate]] : [])];
  if (to.length === 0) throw new UsageError("Pass --to <address> or --simulate <outcome>.");
  const timeoutS = values.timeout === undefined ? 60 : Number(values.timeout);
  if (!Number.isFinite(timeoutS) || timeoutS <= 0) {
    throw new UsageError("--timeout takes a number of seconds.");
  }

  const credentials = await resolveCredentials(context);
  const live = credentials.apiKey.startsWith("coss_live_");
  if (live && !values.from) {
    throw new UsageError("Live keys send from your own domain: pass --from you@your-domain.");
  }
  const base = {
    from: values.from ?? SANDBOX_FROM,
    to,
    ...(values.cc && { cc: addresses(values.cc) }),
    ...(values.bcc && { bcc: addresses(values.bcc) }),
    ...(values["reply-to"] && { reply_to: addresses(values["reply-to"]) }),
    ...(values.category && { category: values.category }),
    ...(values.tag && {
      tags: pairs(values.tag, "tag").map(([name, value]) => ({ name, value })),
    }),
  };
  const text = await fileOrValue(values.text, values["text-file"], "text");
  const html = await fileOrValue(values.html, values["html-file"], "html");
  let params: SendEmailParams;
  if (values.template) {
    if (values.subject || text !== undefined || html !== undefined) {
      throw new UsageError(
        "A template brings its own subject and body: drop --subject/--text/--html.",
      );
    }
    params = {
      ...base,
      template_id: values.template,
      ...(values.var && {
        variables: Object.fromEntries(
          pairs(values.var, "var").map(([name, raw]) => [name, variableValue(raw)]),
        ),
      }),
    };
  } else {
    if (values.var) throw new UsageError("--var only applies with --template.");
    params = {
      ...base,
      subject: values.subject ?? DEFAULT_SUBJECT,
      ...(html !== undefined && { html }),
      ...(text !== undefined || html === undefined ? { text: text ?? DEFAULT_TEXT } : {}),
    };
  }

  const coss = clientFor(io, credentials);
  const { data: email, error } = await coss.email.send(params, { signal: io.signal });
  if (error) throw apiError("Couldn't send the email", error);

  if (!values.wait) {
    if (out.json) out.data(email);
    else {
      out.line(
        `${out.style("green", "✔")} ${email.id} ${email.status} → ${to.join(", ")}${email.sandbox ? out.style("dim", " (sandbox)") : ""}`,
      );
      out.info(
        out.style("dim", "Add --wait to follow it, or run `coss logs tail` to watch every event."),
      );
    }
    return 0;
  }

  const outcome = await waitForOutcome(context, coss, email, {
    timeoutMs: timeoutS * 1000,
    simulate,
  });
  if (out.json) {
    out.data({ ...outcome.email, events: outcome.events });
  } else {
    out.line(
      `${outcome.email.id} ${out.style(statusStyle(outcome.email.status), outcome.email.status)}`,
    );
    for (const recipient of outcome.email.recipients) {
      out.line(
        `  ${recipient.address}  ${out.style(statusStyle(recipient.status), recipient.status)}`,
      );
    }
    if (outcome.events.length > 0) out.line();
    for (const event of outcome.events) {
      out.line(
        `  ${out.style("dim", event.occurred_at)}  ${event.type}${event.recipient ? `  ${event.recipient}` : ""}`,
      );
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
