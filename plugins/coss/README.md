# coss.com plugin

A [Claude Code](https://code.claude.com) plugin for building with [coss.com](https://coss.com):

- the `coss` skill: how to add coss.com to a project (the docs for agents, a development key from
  `npx coss-cli init`, the SDK's conventions, testing webhooks), loaded when a task involves it;
- the [coss.com MCP server](https://coss.com/docs/mcp) (`npx -y coss-mcp`): searches and reads the
  docs, and with an API key looks up emails and SMS and explains their delivery.

```text
/plugin install coss --marketplace cosscom/coss
```

On Claude Code before 2.1.275: `/plugin marketplace add cosscom/coss`, then `/plugin install coss@coss`.
Installing asks for an API key for the MCP server: a development key (`coss_test_…`), or nothing
for the docs tools only.

Other agents (Cursor, Codex, GitHub Copilot, …) get the same skill with
`npx skills add cosscom/coss`. See [coss.com/docs/agents](https://coss.com/docs/agents).

## License

MIT
