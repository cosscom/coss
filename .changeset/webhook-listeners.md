---
"coss": minor
---

`coss.webhookListeners` (`create`, `poll`, `delete`; `POST /v1/webhook_listeners`, `POST /v1/webhook_listeners/{id}/poll`, `DELETE /v1/webhook_listeners/{id}`): temporary listeners that receive the environment's events by long poll, so a CLI can forward them to a local server (`coss listen`). Polls hand out each event's body exactly as an endpoint would receive it, and take acknowledgements of earlier deliveries.
