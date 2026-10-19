---
"coss": minor
---

`coss.billing.usage()` takes `group_by: "project" | "api_key" | "user"` (besides `"environment"`), and each usage row has `project_id`, `api_key_id` and `user_id` (`user_id`: the member whose personal API key caused the usage).
