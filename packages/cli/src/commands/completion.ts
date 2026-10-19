import { type Command, defineCommand } from "../command.ts";
import { completionScript, SHELLS, type Shell } from "../completion.ts";
import { UsageError } from "../errors.ts";

export const completionCommand: Command = defineCommand({
  name: "completion",
  summary: "Print the shell completion script (bash, zsh, fish)",
  usage: "<bash|zsh|fish>",
  description:
    'Prints the script that completes coss commands, flags and their values in your shell. Load it from your shell\'s profile: eval "$(coss completion zsh)" in ~/.zshrc (after compinit), eval "$(coss completion bash)" in ~/.bashrc, or for fish: coss completion fish > ~/.config/fish/completions/coss.fish',
  flags: {},
  positionals: true,
  positionalChoices: SHELLS,
  run: async ({ positionals, context }) => {
    const [shell, ...extra] = positionals;
    if (!SHELLS.includes(shell as Shell) || extra.length > 0) {
      throw new UsageError(
        `Pass the shell: ${SHELLS.map((name) => `\`coss completion ${name}\``).join(", ")}.`,
      );
    }
    context.out.raw(completionScript(shell as Shell));
    return 0;
  },
});
