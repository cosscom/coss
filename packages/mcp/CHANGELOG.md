# coss-mcp

## 0.2.3

### Patch Changes

- 2857473: `coss/diagnose` explains an email's delivery: `diagnose(coss, id)` reads the email, its events and its account context, and `diagnoseEmail` is the pure part (moved from `coss-mcp`, which now uses it and still re-exports it). The CLI gets `coss emails list`, `coss emails get`, `coss emails events` and `coss emails diagnose`, and `coss inbox` (the inbound domain, then received emails as they arrive) with `coss inbox get`.
- Updated dependencies [e13f0e4]
- Updated dependencies [2857473]
- Updated dependencies [78b99d3]
- Updated dependencies [8fea903]
  - coss@0.7.0

## 0.2.2

### Patch Changes

- Updated dependencies [0d7a859]
- Updated dependencies [9cfbbfa]
- Updated dependencies [9682942]
- Updated dependencies [1d2d0f6]
  - coss@0.6.0

## 0.2.1

### Patch Changes

- Updated dependencies [990da3c]
  - coss@0.5.0

## 0.2.0

### Minor Changes

- 0005212: One-click unsubscribe (RFC 8058): `unsubscribe` in tracking rules (`coss.email.tracking`) and in a
  send's `tracking` option, `tracking.unsubscribe` on emails, the `email.unsubscribed` event and the
  `unsubscribe` suppression reason. The MCP server's send tool takes `tracking.unsubscribe`.

### Patch Changes

- Updated dependencies [5444ed6]
- Updated dependencies [4439171]
- Updated dependencies [ad46699]
- Updated dependencies [9734c4f]
- Updated dependencies [7734ef4]
- Updated dependencies [77505e7]
- Updated dependencies [747e8f9]
- Updated dependencies [0005212]
- Updated dependencies [ffc8666]
- Updated dependencies [0a992f6]
- Updated dependencies [4ea7298]
  - coss@0.4.0

## 0.1.0

### Minor Changes

- 57a79b8: First release of `coss-mcp`, the coss.com MCP server: coding agents can find emails and diagnose their delivery (`diagnose_email`), send test emails, manage suppressions and domains, inspect webhook deliveries, received emails and logs, and check the account's reputation and billing standing. Run it with `npx -y coss-mcp` and `COSS_API_KEY`.

### Patch Changes

- Updated dependencies [57a79b8]
- Updated dependencies [01979e0]
- Updated dependencies [c6fa2fd]
  - coss@0.3.0
