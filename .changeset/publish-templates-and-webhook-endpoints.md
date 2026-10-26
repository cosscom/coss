---
"coss": patch
"coss-mcp": minor
"coss-cli": minor
---

Publish a template and register a webhook endpoint from the tools an agent already uses.

`publish_email_template` publishes the draft revision it just read. `create_webhook_endpoint` and `coss webhooks add` create an endpoint once and write its signing secret to the project env file as `COSS_WEBHOOK_SECRET`. A URL that already has an endpoint is left as it is. `coss init` snippets send to the mailbox simulator from the address setup reports.
