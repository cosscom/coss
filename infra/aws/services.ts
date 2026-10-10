/**
 * What each deployable runs and needs: the source of truth for ECS task definitions (README.md,
 * "Deploying to AWS", is the human runbook). `bun run --cwd infra aws:spec` prints it as JSON.
 * infra/test checks it against the apps' env schemas, turbo.json and the Dockerfiles.
 */

export type ServiceName = "web" | "site" | "api" | "worker";

/**
 * - `plain`: a task-definition `environment` value (`value`: the production value, or how to get it).
 * - `secret`: from Secrets Manager (`secrets`/`valueFrom`), one JSON secret per stage.
 * - `image`: already set by the Dockerfile; listed for completeness, don't override.
 */
export type EnvVar = {
  name: string;
  kind: "plain" | "secret" | "image";
  required: boolean;
  value?: string;
  description: string;
};

export type Service = {
  name: ServiceName;
  dockerfile: string;
  /** Container port the ALB target group forwards to (absent: no load balancer). */
  port?: number;
  /** ALB target group health check: HTTP 200 expected. Never touches the database. */
  healthCheckPath?: string;
  /** Seconds between SIGTERM and SIGKILL (ECS `stopTimeout`; Fargate allows at most 120). */
  stopTimeout: number;
  /** Fargate size (arm64). A starting point: watch CPU/memory and adjust. */
  cpu: number;
  memory: number;
  minTasks: number;
  /** Customer webhooks go to arbitrary public URLs: needs a NAT gateway (VPC endpoints can't). */
  needsInternet: boolean;
  /** IAM policy created by `ses:bootstrap` (path /coss/, `<name>-…`) to attach to the task role. */
  taskRolePolicy?: string;
  env: EnvVar[];
};

const db: EnvVar[] = [
  {
    name: "DATABASE_URL",
    kind: "secret",
    required: true,
    value:
      "postgres://<user>:<password>@<rds-endpoint>:5432/coss?sslmode=verify-full&sslrootcert=/etc/ssl/certs/rds-global-bundle.pem",
    description: "RDS Postgres over verified TLS (the images ship the RDS CA bundle at that path).",
  },
  {
    name: "DATABASE_POOL_MAX",
    kind: "plain",
    required: false,
    value: "10",
    description: "pg pool size per task. Sum over all tasks must stay below RDS max_connections.",
  },
];

const email: EnvVar[] = [
  {
    name: "EMAIL_PROVIDER",
    kind: "plain",
    required: true,
    value: "ses",
    description: "Live environments send through SES.",
  },
  { name: "AWS_REGION", kind: "plain", required: true, description: "Printed by ses:bootstrap." },
  {
    name: "SES_CONFIGURATION_SET",
    kind: "plain",
    required: true,
    description: "Printed by ses:bootstrap.",
  },
  {
    name: "SES_TENANT_PREFIX",
    kind: "plain",
    required: true,
    description: "Printed by ses:bootstrap.",
  },
];

const webhookKey: EnvVar = {
  name: "WEBHOOK_SECRETS_KEY",
  kind: "secret",
  required: true,
  value: "openssl rand -base64 32 (one per stage; losing it makes endpoint secrets unreadable)",
  description: "Encrypts webhook signing secrets. Same value for web, api and worker.",
};

const auth: EnvVar[] = [
  {
    name: "BETTER_AUTH_SECRET",
    kind: "secret",
    required: true,
    value: "openssl rand -base64 32 (one per stage)",
    description: "Signs sessions. Same value for web and api.",
  },
  {
    name: "BETTER_AUTH_URL",
    kind: "plain",
    required: true,
    value: "https://coss.com",
    description:
      "Origin of both zones (site and dashboard): base URL, trusted origin, secure cookies.",
  },
];

const apiPublicUrl: EnvVar = {
  name: "API_PUBLIC_URL",
  kind: "plain",
  required: true,
  value: "https://api.coss.com",
  description: "The API's public origin (OpenAPI servers; the dashboard's quick-start snippets).",
};

export const SERVICES: Service[] = [
  {
    name: "web",
    dockerfile: "apps/web/Dockerfile",
    port: 3000,
    healthCheckPath: "/api/health",
    stopTimeout: 30,
    cpu: 512,
    memory: 1024,
    minTasks: 2,
    needsInternet: false,
    taskRolePolicy: "dashboard",
    env: [
      ...db,
      ...auth,
      apiPublicUrl,
      ...email,
      webhookKey,
      {
        name: "NEXT_SERVER_ACTIONS_ENCRYPTION_KEY",
        kind: "secret",
        required: true,
        value: "openssl rand -base64 32 (one per stage)",
        description: "Shared by every dashboard task so Server Actions work across tasks.",
      },
      {
        name: "TRUSTED_PROXY_HOPS",
        kind: "plain",
        required: true,
        value: "2",
        description:
          "CloudFront + ALB append to X-Forwarded-For; the client is the entry they vouch for.",
      },
      { name: "NODE_ENV", kind: "image", required: true, value: "production", description: "" },
      { name: "PORT", kind: "image", required: true, value: "3000", description: "" },
      { name: "HOSTNAME", kind: "image", required: true, value: "0.0.0.0", description: "" },
      {
        name: "KEEP_ALIVE_TIMEOUT",
        kind: "image",
        required: true,
        value: "75000",
        description:
          "Above the ALB idle timeout (60 s), or the ALB may reuse a closing connection (502).",
      },
    ],
  },
  {
    name: "site",
    dockerfile: "apps/site/Dockerfile",
    port: 3002,
    healthCheckPath: "/api/health",
    stopTimeout: 30,
    cpu: 256,
    memory: 512,
    minTasks: 2,
    needsInternet: false,
    env: [
      { name: "NODE_ENV", kind: "image", required: true, value: "production", description: "" },
      { name: "PORT", kind: "image", required: true, value: "3002", description: "" },
      { name: "HOSTNAME", kind: "image", required: true, value: "0.0.0.0", description: "" },
      {
        name: "KEEP_ALIVE_TIMEOUT",
        kind: "image",
        required: true,
        value: "75000",
        description: "",
      },
    ],
  },
  {
    name: "api",
    dockerfile: "apps/api/Dockerfile",
    port: 3001,
    healthCheckPath: "/health",
    stopTimeout: 30,
    cpu: 512,
    memory: 1024,
    minTasks: 2,
    needsInternet: false,
    taskRolePolicy: "api",
    env: [
      ...db,
      ...auth,
      apiPublicUrl,
      {
        name: "API_CORS_ORIGINS",
        kind: "plain",
        required: false,
        value: "https://coss.com",
        description: "Browser origins allowed on /v1/* (the docs' playground).",
      },
      ...email,
      webhookKey,
      { name: "NODE_ENV", kind: "image", required: true, value: "production", description: "" },
      { name: "API_PORT", kind: "image", required: true, value: "3001", description: "" },
    ],
  },
  {
    name: "worker",
    dockerfile: "apps/worker/Dockerfile",
    // Lets each loop finish its current item: a webhook attempt (10 s), a domain check, an SQS batch.
    stopTimeout: 120,
    cpu: 256,
    memory: 512,
    minTasks: 1,
    needsInternet: true,
    taskRolePolicy: "worker",
    env: [
      ...db,
      ...email,
      {
        name: "SES_EVENTS_QUEUE_URL",
        kind: "plain",
        required: true,
        description: "Printed by ses:bootstrap.",
      },
      webhookKey,
      { name: "NODE_ENV", kind: "image", required: true, value: "production", description: "" },
    ],
  },
];

/** One-off ECS tasks (`aws ecs run-task` with a command override), run from a service's image. */
export const ONE_OFF_TASKS = [
  {
    name: "migrate",
    image: "worker",
    command: ["bun", "packages/db/src/migrate.ts"],
    when: "Before every deploy, alone (never two at once). Needs only DATABASE_URL.",
  },
  {
    name: "ses-bootstrap",
    image: "worker",
    command: [
      "bun",
      "apps/worker/scripts/ses-bootstrap.ts",
      "--name",
      "coss",
      "--tenant-prefix",
      "coss",
    ],
    when:
      "Once per stage after the first migrate, and after upgrades that change it. Needs DATABASE_URL, " +
      "AWS_REGION and a task role allowed to manage SES, SNS, SQS, EventBridge, IAM and CloudWatch.",
  },
  {
    name: "create-admin",
    image: "api",
    command: ["bun", "packages/tenancy/scripts/create-admin.ts", "--email", "<email>"],
    when: "Once, after that user signed up: makes them a platform admin. Run with the api service's environment.",
  },
] as const;
