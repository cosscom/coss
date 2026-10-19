---
"coss": minor
"coss-cli": minor
---

`coss.request(method, path, options)` calls any endpoint by its path (for one the SDK has no method for yet), with the client's key, version, timeout and retries; POST, PUT and PATCH are retried only with `retry: true`. The CLI's new `coss api <path>` uses it: `-f`/`-F` fields, `--input` bodies (or stdin), `--paginate` and `--raw`. Also `coss completion bash|zsh|fish`, and every command's `--help` is now generated from its flags.
