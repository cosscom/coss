/**
 * `coss inboxes …`: email addresses for agents (`coss.inboxes`): create and list them, read their
 * threads and reply. `coss inbox` follows everything the environment receives.
 */
import type { Coss, InboxMessage } from "coss";
import { type Flags, requireArgs } from "../args.ts";
import { type Command, type CommandInput, defineCommand } from "../command.ts";
import { type Context, clientFor, resolveCredentials } from "../context.ts";
import { printable } from "../emails/format.ts";
import { apiError, UsageError } from "../errors.ts";
import type { Output } from "../output.ts";
import { limitOf, printList, when } from "./hooks.ts";

const LIMIT = {
  type: "string",
  value: "<n>",
  description: "How many to show, 1-100 (default 20)",
} as const;

async function client(context: Context): Promise<Coss> {
  return clientFor(context.io, await resolveCredentials(context));
}

const LIST_FLAGS = {
  limit: LIMIT,
  json: { type: "boolean", description: "One inbox per line, as JSON" },
} as const satisfies Flags;

const list: Command = defineCommand({
  name: "inboxes list",
  summary: "List the environment's inboxes",
  description: "Lists the environment's inboxes (addresses for agents), newest first.",
  flags: LIST_FLAGS,
  run: async ({ values, context }: CommandInput<typeof LIST_FLAGS>) => {
    const coss = await client(context);
    const { data, error } = await coss.inboxes.list({ limit: limitOf(values.limit) });
    if (error) throw apiError("Couldn't list the inboxes", error);
    printList(context.out, data, {
      headings: ["ID", "ADDRESS", "NAME", "SENDS", "CREATED"],
      row: (inbox) => [
        inbox.id,
        inbox.address,
        inbox.display_name ?? "",
        inbox.can_send ? "yes" : "no",
        when(inbox.created_at),
      ],
      empty: "No inboxes yet: `coss inboxes create` makes one.",
      more: "There are more: `coss api inboxes --paginate` lists them all.",
    });
    return 0;
  },
});

const CREATE_FLAGS = {
  username: {
    type: "string",
    value: "<name>",
    description: "The part before the @ (default: a random one)",
  },
  domain: {
    type: "string",
    value: "<hostname>",
    description: "A receiving domain of the environment (default: its coss.com inbound domain)",
  },
  name: { type: "string", value: "<name>", description: "The name messages are sent with" },
  "client-id": {
    type: "string",
    value: "<id>",
    description: "Your own id for the inbox: creating it again returns the same inbox",
  },
  json: { type: "boolean", description: "Print the inbox as JSON" },
} as const satisfies Flags;

const create: Command = defineCommand({
  name: "inboxes create",
  summary: "Create an inbox: an email address for an agent",
  description:
    "Creates an inbox in the environment. Mail to it is kept as threads, and each message sends " +
    "an inbox.message.received webhook (`coss listen` forwards them while you develop).",
  flags: CREATE_FLAGS,
  run: async ({ values, context }: CommandInput<typeof CREATE_FLAGS>) => {
    const coss = await client(context);
    const { data, error } = await coss.inboxes.create({
      ...(values.username !== undefined && { username: values.username }),
      ...(values.domain !== undefined && { domain: values.domain }),
      ...(values.name !== undefined && { display_name: values.name }),
      ...(values["client-id"] !== undefined && { client_id: values["client-id"] }),
    });
    if (error) throw apiError("Couldn't create the inbox", error);
    const { out } = context;
    if (out.json) out.data(data);
    else {
      out.line(
        `${out.style("green", "✔")} ${out.style("bold", data.address)} ${out.style("dim", data.id)}`,
      );
      if (!data.can_send) {
        out.info(
          "It receives only: live inboxes send from a receiving domain under a verified domain (--domain).",
        );
      }
    }
    return 0;
  },
});

const THREADS_FLAGS = {
  limit: LIMIT,
  json: { type: "boolean", description: "One thread per line, as JSON" },
} as const satisfies Flags;

const threads: Command = defineCommand({
  name: "inboxes threads",
  summary: "List an inbox's conversations",
  usage: "<inbox> [options]",
  description:
    "Lists the inbox's threads, latest activity first; ● marks one whose latest message is " +
    "inbound (it awaits a reply).",
  flags: THREADS_FLAGS,
  positionals: true,
  run: async ({ values, positionals, context }: CommandInput<typeof THREADS_FLAGS>) => {
    const [inboxId] = requireArgs(positionals, 1, "inboxes threads <inbox>") as [string];
    const coss = await client(context);
    const { data, error } = await coss.inboxes.threads.list(inboxId, {
      limit: limitOf(values.limit),
    });
    if (error) throw apiError("Couldn't list the threads", error);
    printList(context.out, data, {
      headings: ["", "ID", "SUBJECT", "WITH", "MESSAGES", "LAST"],
      row: (thread) => [
        thread.last_inbound_at === thread.last_message_at ? "●" : "",
        thread.id,
        printable(thread.subject ?? "(no subject)"),
        printable(thread.participants.join(", ")),
        String(thread.message_count),
        when(thread.last_message_at),
      ],
      empty: "No conversations yet.",
      more: "There are more: raise --limit, or `coss api inboxes/<inbox>/threads --paginate`.",
    });
    return 0;
  },
});

function printMessage(out: Output, message: InboxMessage, full: boolean): void {
  const arrow = message.direction === "inbound" ? out.style("cyan", "←") : out.style("green", "→");
  out.line(
    `${arrow} ${out.style("bold", printable(message.from ?? "(unknown sender)"))}  ${out.style("dim", `${when(message.created_at)}  ${message.id}`)}`,
  );
  if (message.direction === "outbound") {
    out.line(`  ${out.style("dim", `to ${printable(message.to.join(", "))} · ${message.status}`)}`);
  }
  for (const attachment of message.attachments) {
    out.line(`  ${out.style("dim", `📎 ${printable(attachment.filename ?? "(unnamed)")}`)}`);
  }
  const text = full ? message.text : message.extracted_text;
  out.line();
  out.line(text === null ? out.style("dim", "(no text)") : printable(text, true));
  out.line();
}

const THREAD_FLAGS = {
  full: { type: "boolean", description: "Print every message's whole text, quotes included" },
  json: { type: "boolean", description: "Print the thread as JSON" },
} as const satisfies Flags;

const thread: Command = defineCommand({
  name: "inboxes thread",
  summary: "Read a conversation",
  usage: "<inbox> <thread> [options]",
  description:
    "Prints the thread's latest messages, oldest first, each with its own words (without the " +
    "quoted conversation, unless --full). Control characters in senders' text are left out.",
  flags: THREAD_FLAGS,
  positionals: true,
  run: async ({ values, positionals, context }: CommandInput<typeof THREAD_FLAGS>) => {
    const [inboxId, threadId] = requireArgs(positionals, 2, "inboxes thread <inbox> <thread>") as [
      string,
      string,
    ];
    const coss = await client(context);
    const { data, error } = await coss.inboxes.threads.get(inboxId, threadId);
    if (error) throw apiError("Couldn't read the thread", error);
    const { out } = context;
    if (out.json) {
      out.data(data);
      return 0;
    }
    out.line(out.style("bold", printable(data.subject ?? "(no subject)")));
    out.line(out.style("dim", `with ${printable(data.participants.join(", "))}`));
    out.line();
    for (const message of data.messages) printMessage(out, message, values.full === true);
    return 0;
  },
});

const REPLY_FLAGS = {
  text: { type: "string", value: "<text>", description: "The reply's text" },
  all: { type: "boolean", description: "Reply to everyone on the message, not only the sender" },
  json: { type: "boolean", description: "Print the reply as JSON" },
} as const satisfies Flags;

const reply: Command = defineCommand({
  name: "inboxes reply",
  summary: "Reply to a message from its inbox",
  usage: "<inbox> <message> --text <text> [--all]",
  description:
    "Replies in the message's thread from the inbox's address, to its sender (--all: everyone " +
    "on it), with Re: and the headers mail clients thread by.",
  flags: REPLY_FLAGS,
  positionals: true,
  run: async ({ values, positionals, context }: CommandInput<typeof REPLY_FLAGS>) => {
    const [inboxId, messageId] = requireArgs(
      positionals,
      2,
      "inboxes reply <inbox> <message> --text <text>",
    ) as [string, string];
    if (!values.text) throw new UsageError("Pass the reply with --text <text>.");
    const coss = await client(context);
    const { data, error } = await coss.inboxes.messages.reply(inboxId, messageId, {
      text: values.text,
      ...(values.all && { reply_all: true }),
    });
    if (error) throw apiError("Couldn't send the reply", error);
    const { out } = context;
    if (out.json) out.data(data);
    else {
      out.line(
        `${out.style("green", "✔")} Replied to ${printable(data.to.join(", "))} ${out.style("dim", data.id)}`,
      );
    }
    return 0;
  },
});

export const INBOXES_COMMANDS: readonly Command[] = [list, create, threads, thread, reply];
