# coss-mcp

The [Model Context Protocol](https://modelcontextprotocol.io) server for [COSS](https://coss.com). Your
coding agent can ask "did the welcome email to jane@example.com get delivered?" and get the answer:
the email, what happened to each recipient and why, and what to do about it.

```sh
claude mcp add coss -e COSS_API_KEY=coss_test_… -- npx -y coss-mcp
```

Any MCP client works the same way: run `npx -y coss-mcp` with `COSS_API_KEY` in its environment.
Setup for Cursor, VS Code and Codex: [coss.com/docs/mcp](https://coss.com/docs/mcp).

Published from [cosscom/coss](https://github.com/cosscom/coss) by CI, with
[provenance](https://docs.npmjs.com/generating-provenance-statements).

## Configuration

| Variable | |
| --- | --- |
| `COSS_API_KEY` | Required. A `coss_test_…` (development) or `coss_live_…` (production) key; the server sees that key's environment. |
| `COSS_BASE_URL` | Another API origin, e.g. `http://localhost:3001`. Defaults to `https://api.coss.com`. |

Configuration is read from the environment only, never from command-line arguments, which other
local processes can read.

API keys can do everything the API can: through this server the agent can also send email and
change suppressions and domains. Tools are annotated (`readOnlyHint`, `destructiveHint`) so clients
can ask before calling the ones that change something.

## Tools

| Area | Tools |
| --- | --- |
| Email delivery | `diagnose_email`, `find_emails`, `get_email` |
| Sending | `send_email`, `cancel_email`, `reschedule_email` |
| Suppressions | `check_suppression`, `list_suppressions`, `add_suppression`, `remove_suppression` |
| Domains | `list_domains`, `get_domain`, `add_domain`, `verify_domain` |
| Webhooks | `list_webhook_endpoints`, `list_webhook_deliveries`, `get_webhook_delivery`, `retry_webhook_delivery` |
| Receiving | `get_inbound_address`, `list_received_emails`, `get_received_email` |
| Logs | `search_logs`, `get_log` |
| Account | `get_account_status` |

## As a library

`createCossMcpServer` returns the server unconnected, for another transport or an existing client:

```ts
import { Coss } from "coss";
import { createCossMcpServer } from "coss-mcp";

const apiKey = process.env.COSS_API_KEY;
const server = createCossMcpServer({ coss: new Coss({ apiKey }), apiKey });
```

`diagnoseEmail({ email, events, context })` is the pure function behind `diagnose_email`.

## Development

```sh
bun run --cwd packages/mcp build   # tsdown, publint, attw
bun run --cwd packages/mcp test
COSS_API_KEY=coss_test_… COSS_BASE_URL=http://localhost:3001 npx @modelcontextprotocol/inspector node packages/mcp/dist/cli.js
```

## License

MIT
