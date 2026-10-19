---
"coss": minor
"coss-cli": minor
---

`coss.email.templates.render(template, { version, locale, variables })` renders a template's draft (or a published version) as a send would, without sending (`POST /v1/email_templates/{id}/render`). The CLI gets `coss domains list|add|get|verify` (DNS records as a table or zone-file lines with `--format bind`; `verify --wait` follows the domain until it's verified) and templates as code: `coss templates list|pull|push|preview` (a folder per template, `push --watch` and `--publish`, `preview --var … --open`).
