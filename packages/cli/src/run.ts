import { emailsSend } from "./commands/emails.ts";
import { listen } from "./commands/listen.ts";
import { login } from "./commands/login.ts";
import { logout } from "./commands/logout.ts";
import { logsTail } from "./commands/logs.ts";
import { whoami } from "./commands/whoami.ts";
import { CliError } from "./errors.ts";
import type { CliIo } from "./io.ts";
import { Output } from "./output.ts";
import { VERSION } from "./version.ts";

export const HELP: string = `coss ${VERSION}: the COSS command line

Usage: coss <command> [options]

Commands:
  login          Sign in (in the browser, or --manual with an API key)
  logout         Sign out (revokes the key login created)
  whoami         Show the API key in use and its environment
  emails send    Send a test email (--simulate bounced, --wait…)
  logs tail      Follow the environment's log
  listen         Forward the environment's webhook events to a local URL

Global options:
  --profile <name>   Use a saved profile other than the default (or set COSS_PROFILE)
  --json             Machine-readable output
  --no-color         No colors (also NO_COLOR)
  -h, --help         Help for a command
  -v, --version      The CLI's version

Environment: COSS_API_KEY (use this key instead of a saved one), COSS_BASE_URL (another API,
e.g. http://localhost:3001), COSS_DASHBOARD_URL (another dashboard, for login).
Docs: https://coss.com/docs/cli
`;

type Command = (argv: string[], io: CliIo) => Promise<number>;

const COMMANDS: Record<string, Command | Record<string, Command>> = {
  login,
  logout,
  whoami,
  emails: { send: emailsSend },
  logs: { tail: logsTail },
  listen,
};

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
  const entry = COMMANDS[name];
  let command: Command | undefined;
  let args = rest;
  if (typeof entry === "function") command = entry;
  else if (entry) {
    const [sub, ...subRest] = rest;
    command = sub ? entry[sub] : undefined;
    args = subRest;
    if (!command) {
      out.error(
        `${sub ? `Unknown command "${name} ${sub}"` : `"${name}" needs a command`}: try ${Object.keys(
          entry,
        )
          .map((key) => `\`coss ${name} ${key}\``)
          .join(", ")}.`,
      );
      return 2;
    }
  }
  if (!command) {
    out.error(`Unknown command "${name}". Run \`coss --help\` to see the commands.`);
    return 2;
  }
  try {
    return await command(args, io);
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
