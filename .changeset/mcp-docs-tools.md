---
"coss-mcp": minor
---

Docs tools: `search_docs` searches coss.com's guides, SDK pages and API reference, and `read_docs` reads a page as Markdown (an API operation's parameters, bodies, responses and samples included). Both work without an API key: `COSS_API_KEY` is now optional, and without it the server offers only these two tools (and explains how to get a key) instead of exiting. `createCossMcpServer`'s `coss` option is optional for the same reason, and its new `docs` option points the docs tools elsewhere.
