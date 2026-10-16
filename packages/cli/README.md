# coss-cli

The command line for [coss.com](https://coss.com): sign in, send test emails, follow your environment's
log, and receive its webhook events on your machine.

```sh
npm install -g coss-cli    # or: npx coss-cli <command>
coss login
coss listen --forward-to localhost:3000/webhooks
```

Published from [cosscom/coss](https://github.com/cosscom/coss) by CI, with
[provenance](https://docs.npmjs.com/generating-provenance-statements). Full guide:
[coss.com/docs/cli](https://coss.com/docs/cli).

## Commands

| Command | |
| --- | --- |
| `coss login` | Opens the dashboard, where you pick an environment; the CLI gets a new API key of it. `--manual` pastes an existing key instead; `--no-browser` (the default over SSH) shows a link and asks for the code it displays. |
| `coss logout` | Removes the saved key, and revokes it if `coss login` created it (`--revoke` revokes a pasted one too; `--all` signs every profile out). |
| `coss whoami` | The key in use, where it comes from, and its organization, project and environment. |
| `coss emails send` | A test email: `--to`, or `--simulate delivered\|bounced\|complained\|suppressed` for the mailbox simulator; `--template` with `--var name=value`; `--wait` follows it to its outcome (up to `--timeout`, 60 s). |
| `coss logs tail` | New lines of the environment's log as they arrive: API requests, email events, webhook attempts. Filter with `--source`, `--level`, `--type`, `--status`, `-q`; `--since 15m` starts earlier; `--interval` sets the poll interval (2000 ms). |
| `coss listen` | Receives the environment's webhook events and forwards each one to `--forward-to`, signed like coss.com signs real deliveries. Verify them with `verifyWebhook` from the `coss` SDK and the signing secret it prints (it stays the same for the profile). `--header "Name: value"` adds a header to forwarded requests. |

Every command takes `--json` (one JSON object per line), `--profile <name>` and `--help`; `coss --version`
prints the CLI's. Results go to stdout, progress to stderr. Exit codes: `0` done, `1` failed, `2` wrong usage,
`130` stopped with Ctrl-C.

## Configuration

| Variable | |
| --- | --- |
| `COSS_API_KEY` | Use this key instead of a saved profile (CI, scripts). |
| `COSS_PROFILE` | The saved profile to use (default: the one `coss login` saved first). |
| `COSS_BASE_URL` | Another API origin, e.g. `http://localhost:3001`. Remembered by `coss login`. |
| `COSS_DASHBOARD_URL` | Another dashboard for `coss login`, e.g. `http://localhost:3000`. |

Keys are saved in `$XDG_CONFIG_HOME/coss/config.json` (`~/.config/coss`, `%APPDATA%\coss` on Windows),
readable only by you. No flag takes a key: command lines are visible to other local processes.

## Development

```sh
bun run --cwd packages/cli build   # tsdown, publint, attw
bun run --cwd packages/cli test
node packages/cli/dist/cli.js --help
```

## License

MIT
