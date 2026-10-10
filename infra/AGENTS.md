# AGENTS.md — infra (deployment spec)

Machine-readable description of the AWS deployment; the human runbook is README.md, "Deploying to AWS".
Nothing here talks to AWS. `bun run --cwd infra aws:spec` prints the whole spec as JSON.

| File | What |
|---|---|
| `aws/services.ts` | The four ECS services (Dockerfile, port, health check, stop timeout, size, task-role policy, every env var and whether it is plain, a Secrets Manager secret or set by the image) and the one-off tasks (migrate, ses-bootstrap, create-admin). |
| `aws/routing.ts` | ALB listener rules and CloudFront cached behaviours, generated from `ZONE_ROUTES` (`@coss/auth/slugs`). |
| `test/spec.test.ts` | Fails when an app validates a variable its service doesn't declare, a declared one is missing from `turbo.json` `globalEnv`, a Dockerfile drifts from the repo's Bun/Node/turbo versions, or a rule breaks ALB limits. |

Rules: when an app gains an env var, declare it in `aws/services.ts` too (plus the usual `.env.example`, t3-env,
`turbo.json`). Routing changes go into `ZONE_ROUTES`, never into this folder. Provisioning must apply the generated
rules as printed (priorities, the origin header on every rule, a fixed 403 default action).
