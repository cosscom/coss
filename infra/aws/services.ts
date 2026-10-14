/**
 * What each deployable runs and needs: the source of truth for ECS task definitions (README.md,
 * "Deploying to AWS", is the human runbook). `bun run --cwd infra aws:spec` prints it as JSON.
 * infra/test checks it against the apps' env schemas, turbo.json and the Dockerfiles.
 */

export type ServiceName = "web" | "site" | "portal" | "api" | "worker";

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
  /** Public DNS checks and customer webhooks need a NAT gateway (VPC endpoints can't serve them). */
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

const trackingDomains: EnvVar[] = [
  {
    name: "TRACKING_DOMAIN_PROVIDER",
    kind: "plain",
    required: true,
    value: "cloudflare",
    description: "Custom tracking domains are Cloudflare for SaaS custom hostnames.",
  },
  {
    name: "CLOUDFLARE_API_TOKEN",
    kind: "secret",
    required: true,
    description:
      "Cloudflare API token limited to the coss.com zone with SSL and Certificates: Edit " +
      "(custom hostnames). Same value for web, api and worker.",
  },
  {
    name: "CLOUDFLARE_ZONE_ID",
    kind: "plain",
    required: true,
    description: "The coss.com zone id (Cloudflare dashboard, zone overview).",
  },
  {
    name: "TRACKING_CNAME_TARGET",
    kind: "plain",
    required: false,
    value: "track.cosslinks.com",
    description: "The zone's fallback origin, which customers CNAME their tracking domain to.",
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
  {
    name: "INBOUND_MANAGED_DOMAIN",
    kind: "plain",
    required: false,
    value: "inbound.coss.com",
    description:
      "Receiving: each environment's `<label>.<domain>` addresses (ses:bootstrap --managed-domain). " +
      "Set with SES_INBOUND_BUCKET, or neither (receiving off).",
  },
  {
    name: "SES_INBOUND_BUCKET",
    kind: "plain",
    required: false,
    description: "Receiving: the bucket received emails are stored in. Printed by ses:bootstrap.",
  },
  ...trackingDomains,
];

const portalPublicUrl: EnvVar = {
  name: "PORTAL_PUBLIC_URL",
  kind: "plain",
  required: false,
  description:
    "Origin of the Hooks portal (apps/portal, on a registrable domain of its own); portal session links point there. Unset: creating a portal session fails (503) until the portal is deployed.",
};

const rateLimits: EnvVar[] = [
  {
    name: "VALKEY_URL",
    kind: "secret",
    required: true,
    description:
      "ElastiCache Serverless TLS URL printed by valkey:bootstrap; shared by web, api and worker.",
  },
  {
    name: "VALKEY_CLUSTER",
    kind: "plain",
    required: true,
    value: "true",
    description: "ElastiCache Serverless uses the cluster protocol.",
  },
  {
    name: "RATE_LIMIT_KEY_PREFIX",
    kind: "plain",
    required: false,
    value: "coss",
    description: "Counter namespace; must match the cache user's ACL.",
  },
  {
    name: "CLIENT_IP_HEADER",
    kind: "plain",
    required: true,
    value: "x-forwarded-for",
    description: "Enables per-IP limits using the trusted proxy chain.",
  },
  {
    name: "TRUSTED_PROXY_COUNT",
    kind: "plain",
    required: true,
    value: "2",
    description: "CloudFront and ALB append to X-Forwarded-For.",
  },
];

const screening: EnvVar[] = [
  {
    name: "SCREENING_CLASSIFIER",
    kind: "plain",
    required: true,
    value: "ai",
    description: "AI content screening of sampled live emails before they are sent (off|fake|ai).",
  },
  {
    name: "SCREENING_MODEL",
    kind: "plain",
    required: false,
    value: "typesafe-ai/jev",
    description: "Vercel AI Gateway decision model id; any Gateway decision model works.",
  },
  {
    name: "AI_GATEWAY_API_KEY",
    kind: "secret",
    required: true,
    description:
      "Vercel AI Gateway key (zero data retention on: needs a Pro or Enterprise team). Worker only.",
  },
];

const billingProvider: EnvVar = {
  name: "BILLING_PROVIDER",
  kind: "plain",
  required: true,
  value: "stripe",
  description:
    "Payment provider of new billing accounts (fake|stripe); admins can move one to manual.",
};

const stripeSecretKey: EnvVar = {
  name: "STRIPE_SECRET_KEY",
  kind: "secret",
  required: true,
  value: "A restricted Stripe key (customers, invoices, Checkout, Customer Portal, credit notes)",
  description: "Stripe API key: the dashboard opens Checkout and the portal, the worker invoices.",
};

const webhookKey: EnvVar = {
  name: "WEBHOOK_SECRETS_KEY",
  kind: "secret",
  required: true,
  value:
    "openssl rand -base64 32 (one per stage; losing it makes endpoint secrets unreadable). A comma-separated " +
    "list while rotating: the first encrypts, every one decrypts",
  description: "Encrypts webhook signing secrets. Same value for web, api and worker.",
};

const riskHashKey: EnvVar = {
  name: "RISK_HASH_KEY",
  kind: "secret",
  required: true,
  value: "openssl rand -base64 32 (one per stage; changing it resets what risk remembers)",
  description:
    "Keys the hashes behind risk's velocity, duplicate detection and fraud memory. Same value for web and api.",
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

const trackingPublicUrl: EnvVar = {
  name: "TRACKING_PUBLIC_URL",
  kind: "plain",
  required: false,
  value: "https://track.cosslinks.com",
  description:
    "Origin of the open/click tracking links in emails (defaults to API_PUBLIC_URL): its own " +
    "domain, so abuse flagged by URL blocklists never lands on coss.com (infra/aws/routing.ts).",
};

const apiPublicUrl: EnvVar = {
  name: "API_PUBLIC_URL",
  kind: "plain",
  required: true,
  value: "https://api.coss.com",
  description: "The API's public origin (OpenAPI, dashboard snippets and email tracking URLs).",
};

/**
 * Error and performance monitoring (Sentry organization `cosscom`, see @coss/observability). Each
 * runtime has its own project; DSNs aren't secrets (browsers receive the dashboard's).
 */
function sentry(project: "web" | "portal" | "api" | "worker"): EnvVar[] {
  return [
    {
      name: "SENTRY_DSN",
      kind: "plain",
      required: false,
      value: `DSN of the \`${project}\` Sentry project (Project settings → Client Keys)`,
      description:
        project === "web"
          ? "The dashboard's server and every browser on coss.com (dashboard and site, through /api/monitoring). Unset: nothing is reported."
          : "Unset: nothing is reported.",
    },
    {
      name: "SENTRY_ENVIRONMENT",
      kind: "plain",
      required: false,
      value: "production (the stage's name)",
      description: "Sentry environment; defaults to NODE_ENV.",
    },
    {
      name: "SENTRY_TRACES_SAMPLE_RATE",
      kind: "plain",
      required: false,
      value: "0.1",
      description: "Share of requests/jobs traced (0–1).",
    },
  ];
}

/** Bun services' Sentry release; the Next.js images have theirs built in (NEXT_DEPLOYMENT_ID). */
const sentryRelease: EnvVar = {
  name: "SENTRY_RELEASE",
  kind: "plain",
  required: false,
  value: "Set by the image (build argument SENTRY_RELEASE, the commit); don't override.",
  description: "Sentry release of every event.",
};

/** COSS's own live environment (worker: sends from it; dashboard: never suspends its org). */
const notificationsEnvironment: EnvVar = {
  name: "NOTIFICATIONS_ENVIRONMENT_ID",
  kind: "plain",
  required: false,
  value: "env_… (a live environment of COSS's own organization)",
  description:
    "Sends account emails (sign-up verification, password resets, invitations) and " +
    "reputation notifications through COSS itself (worker); neither the worker nor admins " +
    "(dashboard) may suspend its organization. Unset until COSS's organization has a " +
    "verified domain: both are held, and nobody can verify their email address.",
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
    needsInternet: true,
    taskRolePolicy: "dashboard",
    env: [
      ...db,
      ...auth,
      ...rateLimits,
      apiPublicUrl,
      ...email,
      webhookKey,
      portalPublicUrl,
      riskHashKey,
      notificationsEnvironment,
      billingProvider,
      stripeSecretKey,
      {
        name: "STRIPE_WEBHOOK_SECRET",
        kind: "secret",
        required: true,
        value:
          "The signing secret of the Stripe webhook endpoint https://coss.com/api/billing/webhook",
        description: "Verifies Stripe webhook signatures (the dashboard's billing webhook route).",
      },
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
      {
        name: "TURNSTILE_SITE_KEY",
        kind: "plain",
        required: true,
        value: "Cloudflare Turnstile widget site key (hostname: the dashboard's)",
        description: "Public; rendered on sign-up, sign-in and password reset.",
      },
      {
        name: "TURNSTILE_SECRET_KEY",
        kind: "secret",
        required: true,
        value: "the same widget's secret key",
        description: "Better Auth's captcha plugin verifies tokens with it (siteverify).",
      },
      {
        name: "GOOGLE_CLIENT_ID",
        kind: "plain",
        required: false,
        value:
          "the Google OAuth client's id (redirect URI https://coss.com/api/auth/callback/google)",
        description: "Sign-in with Google, with GOOGLE_CLIENT_SECRET (both or neither).",
      },
      {
        name: "GOOGLE_CLIENT_SECRET",
        kind: "secret",
        required: false,
        value: "the same OAuth client's secret",
        description: "Sign-in with Google (token exchange).",
      },
      {
        name: "GITHUB_CLIENT_ID",
        kind: "plain",
        required: false,
        value:
          "the GitHub OAuth app's client id (callback https://coss.com/api/auth/callback/github)",
        description: "Sign-in with GitHub, with GITHUB_CLIENT_SECRET (both or neither).",
      },
      {
        name: "GITHUB_CLIENT_SECRET",
        kind: "secret",
        required: false,
        value: "the same OAuth app's client secret",
        description: "Sign-in with GitHub (token exchange).",
      },
      ...sentry("web"),
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
    // The Hooks portal, on its own domain (PORTAL_HOST in routing.ts: Cloudflare → ALB).
    name: "portal",
    dockerfile: "apps/portal/Dockerfile",
    port: 3003,
    healthCheckPath: "/api/health",
    stopTimeout: 30,
    cpu: 256,
    memory: 512,
    minTasks: 2,
    needsInternet: false,
    env: [
      ...db,
      webhookKey,
      ...rateLimits,
      ...sentry("portal"),
      { name: "NODE_ENV", kind: "image", required: true, value: "production", description: "" },
      { name: "PORT", kind: "image", required: true, value: "3003", description: "" },
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
    needsInternet: true,
    taskRolePolicy: "api",
    env: [
      ...db,
      ...auth,
      ...rateLimits,
      apiPublicUrl,
      {
        name: "API_CORS_ORIGINS",
        kind: "plain",
        required: false,
        value: "https://coss.com",
        description: "Browser origins allowed on /v1/* (the docs' playground).",
      },
      ...email,
      trackingPublicUrl,
      webhookKey,
      portalPublicUrl,
      riskHashKey,
      ...sentry("api"),
      sentryRelease,
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
      apiPublicUrl,
      trackingPublicUrl,
      {
        name: "API_PORT",
        kind: "plain",
        required: false,
        value: "3001",
        description: "Development fallback port when API_PUBLIC_URL is unset.",
      },
      {
        name: "SES_EVENTS_QUEUE_URL",
        kind: "plain",
        required: true,
        description: "Printed by ses:bootstrap.",
      },
      {
        name: "WORKER_LOOPS",
        kind: "plain",
        required: false,
        description:
          "Unset: every loop. A second worker service (same image) with `hooks` runs only Hooks deliveries, so their volume scales apart from everything else.",
      },
      {
        name: "SES_INBOUND_QUEUE_URL",
        kind: "plain",
        required: false,
        description: "Receiving: the queue of SES receipt notifications. Printed by ses:bootstrap.",
      },
      // Counted in Valkey: the daily inbound limit per organization (`email.inbound.day`) and
      // Hooks delivery attempts.
      ...rateLimits.filter((v) =>
        ["VALKEY_URL", "VALKEY_CLUSTER", "RATE_LIMIT_KEY_PREFIX"].includes(v.name),
      ),
      {
        name: "LOG_RETENTION_DAYS",
        kind: "plain",
        required: false,
        value: "30",
        description: "Days of environment logs kept (1-31); expired days are dropped hourly.",
      },
      ...screening,
      webhookKey,
      billingProvider,
      stripeSecretKey,
      // Hooks delivery attempts are rate limited per endpoint and destination host.
      {
        name: "IPINFO_TOKEN",
        kind: "secret",
        required: false,
        description:
          "IPinfo Lite download token (free account): ASN and country signals for risk assessments. Unset: those signals are missing.",
      },
      {
        name: "BETTER_AUTH_URL",
        kind: "plain",
        required: true,
        value: "https://coss.com",
        description: "The dashboard's origin, for links in reputation notification emails.",
      },
      notificationsEnvironment,
      {
        name: "NOTIFICATIONS_FROM",
        kind: "plain",
        required: false,
        value: "COSS <notifications@coss.com>",
        description: "Sender of notification emails, on a verified domain of that organization.",
      },
      ...sentry("worker"),
      sentryRelease,
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
      "--managed-domain",
      "inbound.coss.com",
    ],
    when:
      "Once per stage after the first migrate, and after upgrades that change it. Needs DATABASE_URL, " +
      "AWS_REGION and a task role allowed to manage SES, SNS, SQS, EventBridge, S3, IAM and CloudWatch.",
  },
  {
    name: "create-admin",
    image: "api",
    command: ["bun", "packages/tenancy/scripts/create-admin.ts", "--email", "<email>"],
    when: "Once, after that user signed up: makes them a platform admin. Run with the api service's environment.",
  },
  {
    name: "webhooks-reencrypt",
    image: "worker",
    command: ["bun", "apps/worker/scripts/webhooks-reencrypt.ts"],
    when:
      "When rotating WEBHOOK_SECRETS_KEY, after every service runs with the new key first: moves endpoint " +
      "secrets onto it so older keys can be removed. Needs DATABASE_URL and WEBHOOK_SECRETS_KEY.",
  },
] as const;
