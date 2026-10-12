# AGENTS.md — infra (deployment spec and production)

Machine-readable description of the AWS deployment and the Terraform that provisions it; the human runbook is
README.md, "Deploying to AWS". `bun run --cwd infra aws:spec` prints the whole spec as JSON.

| File | What |
|---|---|
| `aws/services.ts` | The four ECS services (Dockerfile, port, health check, stop timeout, size, task-role policy, every env var and whether it is plain, a Secrets Manager secret or set by the image) and the one-off tasks (migrate, ses-bootstrap, create-admin). |
| `aws/routing.ts` | ALB listener rules and CloudFront cached behaviours, generated from `ZONE_ROUTES` (`@coss/auth/slugs`). The coss ui repository's zones (`/ui`, `/origin`, on Vercel) are CloudFront origins of their own, never ALB targets. |
| `aws/spec.ts` | The whole spec as one object; `aws:spec:write` writes it to `terraform/spec.json`. |
| `terraform/` | Production (account 294417174674, us-east-2): network, ECR, RDS, ECS, ALB, CloudFront + WAF, IAM, the CodeBuild-hosted Actions runners of the deploy workflow. Reads `spec.json` for everything the spec owns (env names/kinds, sizes, rules, behaviours); `production.tfvars` holds the plain values. State in S3 (`coss-tfstate-294417174674`). |
| `terraform/scripts/put-secret.sh` | Sets one key of the stage secret (`coss/production`) from the clipboard, stdin or a random value, never printing it. |
| `scripts/ecs-deploy.sh`, `scripts/ecs-task.sh` | Roll services out to an image tag (used by `.github/workflows/deploy.yml`); run one-off commands (migrate, ses-bootstrap, create-admin) in a service's task definition. |
| `test/spec.test.ts` | Fails when an app validates a variable its service doesn't declare, a declared one is missing from `turbo.json` `globalEnv`/`globalPassThroughEnv`, `globalEnv` gains a variable (task hashes must match across machines for the remote cache), a Dockerfile drifts from the repo's Bun/Node/turbo versions, a rule breaks ALB limits, an external zone reaches the ALB, or `terraform/spec.json` is stale. |

Rules: when an app gains an env var, declare it in `aws/services.ts` too (plus the usual `.env.example`, t3-env,
`turbo.json`), run `bun run --cwd infra aws:spec:write`, and give a plain one its value in
`terraform/production.tfvars` (the plan fails for a required plain variable without one) or a secret one its key with
`put-secret.sh`. Routing changes go into `ZONE_ROUTES`, never into this folder (a new external zone also needs its host
in `external_origin_hosts`). Terraform applies the generated rules as printed (priorities, the origin header on every
rule, a fixed 403 default action). Never put secret values in tfvars, the state or a commit; `terraform apply` needs
admin credentials for the account and is run by a human or an agent they asked, not by CI. Services ignore
`task_definition` changes: after an environment change, run the Deploy workflow (it registers revisions from the
latest task definition).
