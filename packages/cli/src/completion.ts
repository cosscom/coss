/**
 * Shell completion: each shell's script asks `coss __complete <words…>` for the candidates, so
 * they always match the installed CLI's commands and flags.
 */
import { type Flags, GLOBAL_FLAGS } from "./args.ts";
import type { Command } from "./command.ts";

export const SHELLS = ["bash", "zsh", "fish"] as const;
export type Shell = (typeof SHELLS)[number];

/** The command `words` name, and how many words that took. */
export function findCommand(
  commands: readonly Command[],
  words: readonly string[],
): { command: Command; length: number } | null {
  for (const command of commands) {
    const parts = command.name.split(" ");
    if (parts.every((part, index) => words[index] === part)) {
      return { command, length: parts.length };
    }
  }
  return null;
}

/**
 * Candidates for the last of `words` (the words after `coss`, the last one being typed, maybe
 * empty), one per line: command names, flags, or a flag's or argument's values.
 */
export function complete(commands: readonly Command[], words: readonly string[]): string[] {
  const current = words.at(-1) ?? "";
  const before = words.slice(0, -1);
  const starting = (values: Iterable<string>) =>
    [...new Set(values)].filter((value) => value.startsWith(current));
  const found = findCommand(commands, before);
  if (!found) {
    // `coss em|` or `coss emails s|`.
    const typed = before.join(" ");
    return starting(
      commands
        .filter((command) => (typed ? command.name.startsWith(`${typed} `) : true))
        .map((command) => command.name.split(" ")[before.length] ?? "")
        .filter(Boolean),
    );
  }
  const flags: Flags = { ...GLOBAL_FLAGS, ...found.command.flags };
  const previous = before.at(-1);
  if (before.length > found.length && previous?.startsWith("-") && !previous.includes("=")) {
    const flag = previous.startsWith("--")
      ? flags[previous.slice(2)]
      : Object.values(flags).find((flag) => flag.short === previous.slice(1));
    // A flag's value: its choices, or nothing (the shell offers files).
    if (flag?.type === "string") return starting(flag.choices ?? []);
  }
  if (current.startsWith("-")) return starting(Object.keys(flags).map((name) => `--${name}`));
  return starting(found.command.positionalChoices ?? []);
}

export function completionScript(shell: Shell): string {
  switch (shell) {
    case "bash":
      return `# coss completion for bash. Add to ~/.bashrc: eval "$(coss completion bash)"
_coss() {
  local IFS=$'\\n'
  COMPREPLY=($(coss __complete "\${COMP_WORDS[@]:1:COMP_CWORD}" 2>/dev/null))
}
complete -o default -F _coss coss
`;
    case "zsh":
      return `#compdef coss
# coss completion for zsh. Add to ~/.zshrc (after compinit): eval "$(coss completion zsh)"
_coss() {
  local out
  out="$(coss __complete "\${(@)words[2,CURRENT]}" 2>/dev/null)"
  if [[ -n $out ]]; then
    local -a candidates
    candidates=("\${(@f)out}")
    compadd -a candidates
  else
    _files
  fi
}
if [[ $funcstack[1] == _coss ]]; then _coss "$@"; else compdef _coss coss; fi
`;
    case "fish":
      return `# coss completion for fish. Save as ~/.config/fish/completions/coss.fish:
#   coss completion fish > ~/.config/fish/completions/coss.fish
function __coss_complete
  set -l words (commandline -opc)
  set -e words[1]
  coss __complete $words (commandline -ct) 2>/dev/null
end
complete -c coss -f -a '(__coss_complete)'
`;
  }
}
