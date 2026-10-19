/** `coss inbox`: the environment's inbound address and the mail it receives. */
import type { Coss, CossError, ReceivedEmail, ReceivedEmailSummary } from "coss";
import type { Flags } from "../args.ts";
import { type Command, type CommandInput, defineCommand } from "../command.ts";
import { clientFor, describeEnvironment, resolveCredentials } from "../context.ts";
import { formatReceived, printable } from "../emails/format.ts";
import { apiError, isTransient, UsageError } from "../errors.ts";
import { parseSince } from "../logs/tail.ts";
import type { Output } from "../output.ts";

const PAGE_SIZE = 100;
/** Pages one poll reads at most. */
const MAX_PAGES = 10;
const MAX_SEEN = 5000;

/** Follows received emails with plain list reads (newest first), printing each new one once. */
export class InboxTail {
  readonly #seen = new Set<string>();
  #first = true;
  readonly #since: Date | null;

  constructor(since: Date | null) {
    this.#since = since;
  }

  /**
   * The emails not seen before, oldest first. The first poll only takes what arrived since
   * `since` (without one: nothing, what's there already isn't news) and remembers the rest.
   */
  async poll(
    coss: Coss,
    signal: AbortSignal,
  ): Promise<{ emails: ReceivedEmailSummary[]; truncated: boolean; error: CossError | null }> {
    const fresh: ReceivedEmailSummary[] = [];
    const first = this.#first;
    let after: string | undefined;
    for (let page = 0; page < MAX_PAGES; page++) {
      const { data, error } = await coss.email.received.list(
        { limit: PAGE_SIZE, ...(after && { after }) },
        { signal },
      );
      if (error) return { emails: [], truncated: false, error };
      let done = !data.has_more || (first && this.#since === null);
      for (const email of data.data) {
        if (this.#seen.has(email.id)) {
          done = true;
          break;
        }
        this.#remember(email.id);
        if (first) {
          if (this.#since === null) continue;
          if (Date.parse(email.received_at) < this.#since.getTime()) {
            done = true;
            break;
          }
        }
        fresh.push(email);
      }
      const last = data.data.at(-1);
      if (done || !last) {
        this.#first = false;
        return { emails: fresh.reverse(), truncated: false, error: null };
      }
      after = last.id;
    }
    this.#first = false;
    return { emails: fresh.reverse(), truncated: true, error: null };
  }

  #remember(id: string): void {
    this.#seen.add(id);
    for (const old of this.#seen) {
      if (this.#seen.size <= MAX_SEEN) break;
      this.#seen.delete(old);
    }
  }
}

const FLAGS = {
  since: {
    type: "string",
    value: "<time>",
    description: "Show emails received since then too: 30s, 15m, 2h, 1d or an ISO 8601 time",
  },
  interval: { type: "string", value: "<ms>", description: "How often to poll (default 2000)" },
  json: {
    type: "boolean",
    description: "The address, then one received email per line, as JSON",
  },
} as const satisfies Flags;

export const inboxCommand: Command = defineCommand({
  name: "inbox",
  summary: "Show the inbound address and follow the mail it receives",
  description:
    "Prints the environment's inbound domain (mail to any address at it is received, no DNS " +
    "setup needed) and then each email the environment receives as it arrives, there or at a " +
    "receiving domain. New emails only, unless --since. `coss inbox get <id>` shows one.",
  flags: FLAGS,
  run: inbox,
});

async function inbox({ values, context }: CommandInput<typeof FLAGS>): Promise<number> {
  const { io, out } = context;
  const intervalMs = values.interval === undefined ? 2000 : Number(values.interval);
  if (!Number.isInteger(intervalMs) || intervalMs < 500) {
    throw new UsageError("--interval takes milliseconds, at least 500.");
  }
  let since: Date | null = null;
  if (values.since !== undefined) {
    since = parseSince(values.since, io.now());
    if (!since) throw new UsageError("--since takes 30s, 15m, 2h, 1d or an ISO 8601 time.");
  }

  const credentials = await resolveCredentials(context);
  const coss = clientFor(io, credentials);
  const [environment, address] = await Promise.all([
    coss.environment.get({ signal: io.signal }),
    coss.email.received.address({ signal: io.signal }),
  ]);
  if (io.signal.aborted) return 130;
  if (environment.error) throw apiError("Couldn't read the environment", environment.error);
  if (address.error) throw apiError("Couldn't read the inbound address", address.error);
  if (out.json) out.data(address.data);
  else {
    const domain = address.data.domain;
    out.line(`${out.style("green", "Inbound domain:")} ${out.style("bold", domain)}`);
    out.info(
      `Mail to any address at it (e.g. test@${domain}) is received by ${describeEnvironment(environment.data)}. Press Ctrl-C to stop.`,
    );
  }

  const tail = new InboxTail(since);
  let failures = 0;
  let warnedTruncated = false;
  while (!io.signal.aborted) {
    const result = await tail.poll(coss, io.signal);
    if (result.error) {
      if (io.signal.aborted) break;
      if (!isTransient(result.error)) throw apiError("Couldn't read received emails", result.error);
      failures++;
      if (failures === 1)
        out.warn(`Couldn't read received emails (${result.error.message}); retrying…`);
      await io.sleep(Math.min(intervalMs * 2 ** failures, 30_000), io.signal);
      continue;
    }
    failures = 0;
    for (const email of result.emails) {
      if (out.json) out.data(email);
      else out.line(formatReceived(out, email));
    }
    if (result.truncated && !warnedTruncated) {
      warnedTruncated = true;
      out.warn("More emails arrived than one poll reads: some were skipped.");
    }
    await io.sleep(intervalMs, io.signal);
  }
  return 130;
}

const GET_FLAGS = {
  headers: { type: "boolean", description: "Print every header too" },
  html: { type: "boolean", description: "Print the HTML body instead of the text" },
  raw: {
    type: "boolean",
    description:
      "Write the whole message as received (message/rfc822) to stdout, e.g. > message.eml",
  },
  json: { type: "boolean", description: "Print the received email as JSON" },
} as const satisfies Flags;

export const inboxGetCommand: Command = defineCommand({
  name: "inbox get",
  summary: "Show a received email",
  usage: "<id> [options]",
  description:
    "Shows an email the environment received: sender, recipients, subject, the receiving " +
    "server's spam, virus, SPF, DKIM and DMARC verdicts, attachments and the text body. " +
    "Control characters in the sender's text are left out of what's printed.",
  flags: GET_FLAGS,
  positionals: true,
  run: inboxGet,
});

function field(out: Output, name: string, value: string | null | undefined): void {
  if (value) out.line(`  ${out.style("dim", name.padEnd(11))}${printable(value)}`);
}

function printReceived(
  out: Output,
  email: ReceivedEmail,
  options: { headers: boolean; html: boolean },
) {
  const status = email.status === "blocked" ? out.style("red", "blocked (virus)") : "";
  out.line(
    `${out.style("bold", email.id)}${status ? `  ${status}` : ""}${email.spam ? `  ${out.style("yellow", "spam")}` : ""}`,
  );
  field(out, "From", email.from);
  field(out, "To", email.to.join(", "));
  field(out, "Cc", email.cc.join(", "));
  field(out, "Reply-To", email.reply_to.join(", "));
  field(out, "Subject", email.subject);
  field(out, "Date", email.sent_at);
  field(out, "Received", `${email.received_at} for ${email.recipients.join(", ")}`);
  field(out, "Envelope", email.mail_from || "(bounce)");
  const verdicts = email.verdicts;
  field(
    out,
    "Verdicts",
    (["spam", "virus", "spf", "dkim", "dmarc"] as const)
      .filter((name) => verdicts[name] !== null)
      .map((name) => `${name} ${verdicts[name]}`)
      .join(", "),
  );
  for (const attachment of email.attachments) {
    field(
      out,
      "Attachment",
      `${attachment.filename ?? "(unnamed)"} (${attachment.content_type}, ${attachment.size} bytes) ${attachment.id}`,
    );
  }
  if (options.headers) {
    out.line();
    for (const header of email.headers) {
      out.line(`  ${out.style("dim", `${printable(header.name)}:`)} ${printable(header.value)}`);
    }
  }
  const body = options.html ? email.html : email.text;
  out.line();
  if (body === null) {
    out.info(
      out.style(
        "dim",
        options.html
          ? "No HTML body."
          : `No text body${email.html !== null ? ": try --html" : ""}.`,
      ),
    );
  } else {
    out.line(printable(body, true));
  }
  if (email.truncated) {
    out.warn(
      `Shortened for the API: \`coss inbox get ${email.id} --raw > message.eml\` has all of it.`,
    );
  }
}

async function inboxGet({
  values,
  positionals,
  context,
}: CommandInput<typeof GET_FLAGS>): Promise<number> {
  const { io, out } = context;
  const [id, ...extra] = positionals;
  if (id === undefined || extra.length > 0) {
    throw new UsageError("Pass one received email id: `coss inbox get <id>`.");
  }
  if (values.raw && (values.html || values.headers || out.json)) {
    throw new UsageError("--raw writes the message alone: drop --html, --headers and --json.");
  }
  const coss = clientFor(io, await resolveCredentials(context));
  if (values.raw) {
    // As received, escape sequences included: not for a terminal.
    if (io.stdout.isTTY) {
      throw new UsageError("--raw writes the message as received: redirect it, e.g. > message.eml");
    }
    const { data, error } = await coss.email.received.getRaw(id, { signal: io.signal });
    if (io.signal.aborted) return 130;
    if (error) throw apiError("Couldn't read the message", error);
    out.raw(data);
    return 0;
  }
  const { data, error } = await coss.email.received.get(id, { signal: io.signal });
  if (io.signal.aborted) return 130;
  if (error) throw apiError("Couldn't read the received email", error);
  if (out.json) out.data(data);
  else printReceived(out, data, { headers: values.headers === true, html: values.html === true });
  return 0;
}
