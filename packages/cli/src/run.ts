import { GLOBAL_FLAGS, parseFlags } from "./args.ts";
import { type Command, commandHelp, flagTable } from "./command.ts";
import { apiCommand } from "./commands/api.ts";
import { completionCommand } from "./commands/completion.ts";
import { emailsSendCommand } from "./commands/emails.ts";
import { listenCommand } from "./commands/listen.ts";
import { loginCommand } from "./commands/login.ts";
import { logoutCommand } from "./commands/logout.ts";
import { logsTailCommand } from "./commands/logs.ts";
import { whoamiCommand } from "./commands/whoami.ts";
import { complete, findCommand } from "./completion.ts";
import { createContext } from "./context.ts";
import { CliError } from "./errors.ts";
import type { CliIo } from "./io.ts";
import { Output } from "./output.ts";
import { VERSION } from "./version.ts";

/** Every command, in the order `coss --help` lists them. */
export const COMMANDS: readonly Command[] = [
  loginCommand,
  logoutCommand,
  whoamiCommand,
  emailsSendCommand,
  logsTailCommand,
  listenCommand,
  apiCommand,
  completionCommand,
];

function topHelp(): string {
  const column = Math.max(...COMMANDS.map((command) => command.name.length)) + 4;
  return `coss ${VERSION}: the coss.com command line

Usage: coss <command> [options]

Commands:
${COMMANDS.map((command) => `  ${command.name.padEnd(column - 2)}${command.summary}`).join("\n")}

Global options:
${flagTable({
  ...GLOBAL_FLAGS,
  version: { type: "boolean", short: "v", description: "The CLI's version" },
}).join("\n")}

Environment: COSS_API_KEY (use this key instead of a saved one), COSS_BASE_URL (another API,
e.g. http://localhost:3001), COSS_DASHBOARD_URL (another dashboard, for login).
Docs: https://coss.com/docs/cli
`;
}

export const HELP: string = topHelp();

/** Runs one invocation (`argv` without node and the script) and returns the exit code. */
export async function run(argv: string[], io: CliIo): Promise<number> {
  const out = new Output(io, {
    json: argv.includes("--json"),
    color: !argv.includes("--no-color"),
  });
  const [name, ...rest] = argv;
  if (name === undefined || name === "help" || name === "--help" || name === "-h") {
    out.line(HELP);
    return 0;
  }
  if (name === "--version" || name === "-v" || name === "version") {
    out.line(VERSION);
    return 0;
  }
  // What the completion scripts call; not a command anyone types.
  if (name === "__complete") {
    for (const candidate of complete(COMMANDS, rest)) out.line(candidate);
    return 0;
  }
  const found = findCommand(COMMANDS, argv);
  if (!found) {
    const group = COMMANDS.filter((command) => command.name.startsWith(`${name} `));
    if (group.length > 0) {
      const sub = rest[0];
      out.error(
        `${sub && !sub.startsWith("-") ? `Unknown command "${name} ${sub}"` : `"${name}" needs a command`}: try ${group
          .map((command) => `\`coss ${command.name}\``)
          .join(", ")}.`,
      );
    } else {
      out.error(`Unknown command "${name}". Run \`coss --help\` to see the commands.`);
    }
    return 2;
  }
  const { command } = found;
  try {
    const parsed = parseFlags(argv.slice(found.length), command.flags, command.positionals);
    const context = createContext(io, parsed.global);
    if (parsed.global.help) {
      context.out.line(commandHelp(command));
      return 0;
    }
    return await command.run({ values: parsed.values, positionals: parsed.positionals, context });
  } catch (error) {
    if (error instanceof CliError) {
      out.error(error.message);
      return error.exitCode;
    }
    out.error(
      `Unexpected error: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}`,
    );
    return 1;
  }
}
