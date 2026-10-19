---
"coss": minor
"coss-mcp": minor
"coss-cli": minor
---

Scoped API keys: `coss.environment.get()` now returns the key's `api_key.access` (`full` or `restricted`) and `api_key.permissions` (`resource:action` strings, e.g. `email:send`). The MCP server's `get_account_status` reports them and its permission errors say the key is restricted; `coss whoami` prints the key's access.
